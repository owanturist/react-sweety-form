import {
  FormEvent,
  Dispatch,
  SetStateAction,
  useCallback,
  useLayoutEffect,
  useRef,
  useEffect,
} from "react"
import { batch, Compare, Sweety, useWatchSweety } from "react-sweety"

type Compute<TObject> = {
  [TKey in keyof TObject]: TObject[TKey]
} & unknown

type WhenUnknown<TFallback, TValue> = unknown extends TValue
  ? TFallback
  : TValue

export type Transform<TValue, TResult> = (value: TValue) => TResult

export type Validate<TValue, TError = null> = (
  value: TValue,
  error: null | TError,
) => null | TError

const alwaysNull = (): null => null

const identity = <T>(value: T): T => value

export type FormReValidateMode = "onChange" | "onBlur" | "onSubmit"

export type FormValidateMode = FormReValidateMode | "onTouched" | "all"

class FormContext {
  public constructor(
    private readonly validateMode: Sweety<FormValidateMode>,
    private readonly reValidateMode: Sweety<FormReValidateMode>,
  ) {}
}

export interface SweetyForm<TValue, TError = null> {
  getValue(): TValue

  getError(): null | TError

  setContext(context: FormContext): void
}

export type FormShapeRecord<TShape = unknown> = Record<
  keyof TShape,
  SweetyForm<unknown, unknown>
>

type UnpackFormValue<TForm> = TForm extends FormField<
  infer TValue,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  infer _TError
>
  ? TValue
  : // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TForm extends FormShape<infer TShape, infer _TError>
  ? UnpackFormShapeValue<TShape>
  : // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TForm extends FormList<infer TItem, infer _TError>
  ? ReadonlyArray<UnpackFormValue<TItem>>
  : never

type UnpackFormShapeValue<TShape extends FormShapeRecord<TShape>> = Compute<{
  readonly [TKey in keyof TShape]: UnpackFormValue<TShape[TKey]>
}>

type UnpackFormError<TForm> = TForm extends FormField<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  infer _TValue,
  infer TError
>
  ? WhenUnknown<null, TError>
  : TForm extends FormShape<infer TShape, infer TError>
  ? FormShapeError<TShape, TError>
  : TForm extends FormList<infer TItem, infer TError>
  ? FormListError<TItem, TError>
  : never

type UnpackFormShapeError<TShape extends FormShapeRecord<TShape>> = Compute<{
  readonly [TKey in keyof TShape]: null | UnpackFormError<TShape[TKey]>
}>

type FormShapeError<
  TShape extends FormShapeRecord<TShape>,
  TError = null,
> = Compute<{
  readonly shape: null | WhenUnknown<null, TError>
  readonly entries: null | UnpackFormShapeError<TShape>
}>

type FormListError<
  TItem extends SweetyForm<unknown, unknown>,
  TError = null,
> = Compute<{
  readonly list: null | WhenUnknown<null, TError>
  readonly items: null | ReadonlyArray<UnpackFormError<TItem>>
}>

// -------------------
// F O R M   V A L U E
// -------------------

interface FormFieldOfOptions<TError = null> {
  error?: null | TError
}

export class FormField<TValue, TError = null>
  implements SweetyForm<TValue, TError>
{
  public static of<TValue, TError = null>(
    value: TValue,
    { error = null }: FormFieldOfOptions<TError> = {},
  ): FormField<TValue, TError> {
    return new FormField(Sweety.of(value), Sweety.of(error))
  }

  private context: FormContext | null = null

  protected constructor(
    private readonly value: Sweety<TValue>,
    private readonly error: Sweety<null | TError>,
  ) {}

  public setContext(context: FormContext): void {
    this.context = context
  }

  public getValue(): TValue {
    return this.value.getState()
  }

  public setValue(transform: (value: TValue) => TValue): void
  public setValue(value: TValue): void
  public setValue(transformOrValue: SetStateAction<TValue>): void {
    this.value.setState(transformOrValue)
  }

  public getError(): null | TError {
    return this.error.getState()
  }

  public setError(transform: (error: null | TError) => null | TError): void
  public setError(error: null | TError): void
  public setError(transformOrError: SetStateAction<null | TError>): void {
    this.error.setState(transformOrError)
  }
}

// -------------------
// F O R M   S H A P E
// -------------------

interface FormShapeOfOptions<TError = null> {
  error?: null | TError
}

export class FormShape<TShape extends FormShapeRecord<TShape>, TError = null>
  implements
    SweetyForm<UnpackFormShapeValue<TShape>, FormShapeError<TShape, TError>>
{
  public static of<TShape extends FormShapeRecord<TShape>, TError = null>(
    entries: TShape,
    { error = null }: FormShapeOfOptions<TError> = {},
  ): FormShape<TShape, TError> {
    return new FormShape(entries, Sweety.of(error))
  }

  private context: FormContext | null = null

  protected constructor(
    public readonly entries: TShape,
    private readonly error: Sweety<null | TError>,
  ) {}

  public setContext(context: FormContext): void {
    if (this.context != null) {
      return
    }

    this.context = context

    const entries = Object.values<SweetyForm<unknown, unknown>>(this.entries)

    for (const entry of entries) {
      entry.setContext(context)
    }
  }

  public getValue(): UnpackFormShapeValue<TShape> {
    const acc = {} as UnpackFormShapeValue<TShape>
    const pairs = Object.entries(this.entries) as Array<
      [keyof TShape, SweetyForm<unknown, unknown>]
    >

    for (const [key, field] of pairs) {
      acc[key] = field.getValue() as UnpackFormValue<TShape[keyof TShape]>
    }

    return acc
  }

  public getError(): null | FormShapeError<TShape, TError> {
    let hasFieldErrors = false
    const entries = {} as UnpackFormShapeError<TShape>
    const pairs = Object.entries(this.entries) as Array<
      [keyof TShape, SweetyForm<unknown, unknown>]
    >

    for (const [key, field] of pairs) {
      entries[key] = field.getError() as UnpackFormError<TShape[keyof TShape]>
      hasFieldErrors = hasFieldErrors || entries[key] != null
    }

    const shapeError = this.error.getState()

    if (shapeError == null && !hasFieldErrors) {
      return null
    }

    return {
      shape: shapeError as WhenUnknown<null, TError>,
      entries: hasFieldErrors ? entries : null,
    }
  }

  public setShapeError(transform: (error: null | TError) => null | TError): void
  public setShapeError(error: null | TError): void
  public setShapeError(transformOrError: SetStateAction<null | TError>): void {
    this.error.setState(transformOrError)
  }
}

interface FormListOfOptions<TError = null> {
  error?: null | TError
}

export class FormList<TItem extends SweetyForm<unknown, unknown>, TError = null>
  implements
    SweetyForm<
      ReadonlyArray<UnpackFormValue<TItem>>,
      FormListError<TItem, TError>
    >
{
  public static of<TItem extends SweetyForm<unknown, unknown>, TError = null>(
    items: ReadonlyArray<TItem>,
    { error = null }: FormListOfOptions<TError> = {},
  ): FormList<TItem, TError> {
    return new FormList(Sweety.of(items), Sweety.of(error))
  }

  private context: FormContext | null = null

  protected constructor(
    private readonly items: Sweety<ReadonlyArray<TItem>>,
    private readonly error: Sweety<null | TError>,
  ) {}

  private spreadContext(): void {
    if (this.context == null) {
      return
    }

    for (const item of this.items.getState()) {
      item.setContext(this.context)
    }
  }

  public setContext(context: FormContext): void {
    if (this.context == null) {
      this.context = context
      this.spreadContext()
    }
  }

  public getValue(): ReadonlyArray<UnpackFormValue<TItem>> {
    return this.items
      .getState()
      .map((item) => item.getValue() as UnpackFormValue<TItem>)
  }

  public getError(): null | FormListError<TItem, TError> {
    let hasItemErrors = false
    const items = [] as Array<UnpackFormError<TItem>>

    for (const item of this.items.getState()) {
      items.push(item.getError() as UnpackFormError<TItem>)
      hasItemErrors = hasItemErrors || items.at(-1) != null
    }

    const listError = this.error.getState()

    if (listError == null && !hasItemErrors) {
      return null
    }

    return {
      list: listError as WhenUnknown<null, TError>,
      items: hasItemErrors ? items : null,
    }
  }

  public setListError(transform: (error: null | TError) => null | TError): void
  public setListError(error: null | TError): void
  public setListError(transformOrError: SetStateAction<null | TError>): void {
    this.error.setState(transformOrError)
  }

  public getItems<TResult = ReadonlyArray<TItem>>(
    select?: (items: ReadonlyArray<TItem>) => TResult,
  ): TResult {
    return this.items.getState(select!)
  }

  // returns an array when it needs to modify the list
  // returns void when modifies items
  public updateItems(
    callback: (items: ReadonlyArray<TItem>) => void | ReadonlyArray<TItem>,
  ): void {
    this.items.setState((items) => callback(items) || items)
    this.spreadContext()
  }
}

// ---------
// H O O K S
// ---------

const throwOnRenderCall: (...args: Array<never>) => unknown = () => {
  throw new Error("The useEvent's callback cannot call during render phase.")
}

const useEvent = <THandler extends (...args: Array<never>) => unknown>(
  handler: THandler,
): THandler => {
  const handlerRef = useRef(throwOnRenderCall)

  handlerRef.current = throwOnRenderCall

  useLayoutEffect(() => {
    handlerRef.current = handler
  })

  return useRef(((...args) => handlerRef.current(...args)) as THandler).current
}

export interface UseFormErrorOptions<TError, TResult = null | TError> {
  compare?: Compare<TResult>
  select?: Transform<null | TError, TResult>
}

export interface UseFormErrorHook {
  <TError, TResult = null | TError>(
    formField: FormField<any, TError>,
    options?: UseFormErrorOptions<TError, TResult>,
  ): [TResult, Dispatch<SetStateAction<null | TError>>]

  <
    TError,
    TShape extends FormShapeRecord<TShape> = FormShapeRecord,
    TResult = null | FormShapeError<TShape, TError>,
  >(
    formShape: FormShape<TShape, TError>,
    options?: UseFormErrorOptions<FormShapeError<TShape, TError>, TResult>,
  ): [TResult, Dispatch<SetStateAction<null | TError>>]

  <
    TError,
    TItem extends SweetyForm<unknown, unknown> = SweetyForm<unknown, unknown>,
    TResult = null | FormListError<TItem, TError>,
  >(
    formList: FormList<TItem, TError>,
    options?: UseFormErrorOptions<FormListError<TItem, TError>, TResult>,
  ): [TResult, Dispatch<SetStateAction<null | TError>>]
}

export const useFormError: UseFormErrorHook = <TError, TResult = null | TError>(
  form: SweetyForm<unknown, TError>,
  {
    select = identity as Transform<null | TError, TResult>,
    compare,
  }: UseFormErrorOptions<TError, TResult> = {},
): [TResult, Dispatch<SetStateAction<null | TError>>] => {
  const error = useWatchSweety(
    useCallback(() => select(form.getError()), [form, select]),
    compare,
  )

  const setError = useEvent(
    (transformOrError: SetStateAction<null | TError>): void => {
      if (form instanceof FormField) {
        form.setError(transformOrError)
      } else if (form instanceof FormShape) {
        form.setShapeError(transformOrError)
      } else if (form instanceof FormList) {
        form.setListError(transformOrError)
      }
    },
  )

  return [error, setError]
}

export interface UseFormValueOptions<TValue, TError = null, TResult = TValue> {
  compare?: Compare<TResult>
  select?: Transform<TValue, TResult>
  validate?: Validate<TValue, TError>
}

export function useFormField<TValue, TError = null, TResult = TValue>(
  formValue: FormField<TValue, TError>,
  {
    select = identity as Transform<TValue, TResult>,
    compare,
    validate = alwaysNull,
  }: UseFormValueOptions<TValue, TError, TResult> = {},
): [TResult, Dispatch<SetStateAction<TValue>>] {
  const value = useWatchSweety(
    useCallback(() => select(formValue.getValue()), [formValue, select]),
    compare,
  )
  const setValue = useEvent((valueOrTransform: SetStateAction<TValue>) => {
    batch(() => {
      formValue.setValue(valueOrTransform as TValue)
      formValue.setError(validate(formValue.getValue(), formValue.getError()))
    })
  })

  // fires when validate changes
  useEffect(() => {
    formValue.setError(validate(formValue.getValue(), formValue.getError()))
  }, [formValue, validate])

  return [value, setValue]
}

export function useFormList<
  TItem extends SweetyForm<unknown, unknown>,
  TError = null,
  TResult = Array<TItem>,
>(
  formList: FormList<TItem, TError>,
  select?: (items: ReadonlyArray<TItem>) => TResult,
  // TODO add shallow array compare by default
  compare?: Compare<TResult>,
): [
  TResult,
  Dispatch<(items: ReadonlyArray<TItem>) => void | ReadonlyArray<TItem>>,
] {
  const items = useWatchSweety(
    useCallback(() => formList.getItems(select), [formList, select]),
    compare,
  )
  const setItems = useEvent(
    (
      callback: (items: ReadonlyArray<TItem>) => void | ReadonlyArray<TItem>,
    ): void => {
      formList.updateItems(callback)
    },
  )

  return [items, setItems]
}

export type SweetyFormOnSubmit<TForm extends SweetyForm<unknown, unknown>> = (
  value: UnpackFormValue<TForm>,
  error: null | UnpackFormError<TForm>,
  form: TForm,
  event?: FormEvent,
) => void | Promise<void>

export interface UseSweetyFormOptions<
  TForm extends SweetyForm<unknown, unknown>,
> {
  validateMode?: FormValidateMode
  reValidateMode?: FormReValidateMode
  onSubmit?: SweetyFormOnSubmit<TForm>
}

export interface UseSweetyFormResult<
  TForm extends SweetyForm<unknown, unknown>,
> {
  form: TForm
  submit: (event?: FormEvent) => void
}

export function useSweetyForm<TForm extends SweetyForm<unknown, unknown>>(
  initForm: () => TForm,
  {
    // TODO implement
    // validateMode = "onSubmit",
    // reValidateMode = "onChange",
    onSubmit,
  }: UseSweetyFormOptions<TForm> = {},
): UseSweetyFormResult<TForm> {
  const formRef = useRef<TForm>()

  if (formRef.current == null) {
    formRef.current = initForm()
  }

  const submit = async (event?: FormEvent): Promise<void> => {
    event?.preventDefault()

    const form = formRef.current!

    const value = form.getValue() as UnpackFormValue<TForm>
    const error = form.getError() as null | UnpackFormError<TForm>

    await onSubmit?.(value, error, form, event)
  }

  return {
    form: formRef.current,
    submit: useEvent((event) => {
      // eslint-disable-next-line no-void
      void submit(event)
    }),
  }
}
