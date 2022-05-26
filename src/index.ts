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

// TODO delete unsesesary selects
const selectSafe = <TValue, TResult = TValue>(
  select: undefined | Transform<TValue, TResult>,
  value: TValue,
): TResult => {
  return typeof select === "function"
    ? select(value)
    : (value as unknown as TResult)
}

const alwaysNull = (): null => null

export interface SweetyForm<TValue, TError = null> {
  getValue<TResult = TValue>(select?: (value: TValue) => TResult): TResult

  getError<TResult = null | TError>(
    select?: (error: null | TError) => TResult,
  ): TResult
}

type UnpackFormValue<TForm> = TForm extends FormValue<
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

type UnpackFormShapeValue<
  TShape extends Record<keyof TShape, SweetyForm<unknown, unknown>>,
> = Compute<{
  readonly [TKey in keyof TShape]: UnpackFormValue<TShape[TKey]>
}>

type UnpackFormError<TForm> = TForm extends FormValue<
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

type UnpackFormShapeError<
  TShape extends Record<keyof TShape, SweetyForm<unknown, unknown>>,
> = Compute<{
  readonly [TKey in keyof TShape]: null | UnpackFormError<TShape[TKey]>
}>

type FormShapeError<
  TShape extends Record<keyof TShape, SweetyForm<unknown, unknown>>,
  TError = null,
> = Compute<{
  readonly shape: null | WhenUnknown<null, TError>
  readonly fields: null | UnpackFormShapeError<TShape>
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

interface FormValueOfOptions<TError = null> {
  error?: null | TError
}

export class FormValue<TValue, TError = null>
  implements SweetyForm<TValue, TError>
{
  public static of<TValue, TError = null>(
    value: TValue,
    { error = null }: FormValueOfOptions<TError> = {},
  ): FormValue<TValue, TError> {
    return new FormValue(Sweety.of(value), Sweety.of(error))
  }

  protected constructor(
    private readonly value: Sweety<TValue>,
    private readonly error: Sweety<null | TError>,
  ) {}

  public getValue<TResult = TValue>(
    select?: (value: TValue) => TResult,
  ): TResult {
    return this.value.getState(select!)
  }

  public setValue(transform: (value: TValue) => TValue): void
  public setValue(value: TValue): void
  public setValue(transformOrValue: SetStateAction<TValue>): void {
    this.value.setState(transformOrValue)
  }

  public getError<TResult = null | TError>(
    select?: (error: null | TError) => TResult,
  ): TResult {
    return this.error.getState(select!)
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any

export class FormShape<
  TShape extends Record<keyof TShape, SweetyForm<unknown, unknown>>,
  TError = null,
> implements
    SweetyForm<UnpackFormShapeValue<TShape>, FormShapeError<TShape, TError>>
{
  public static of<
    TShape extends Record<keyof TShape, SweetyForm<unknown, unknown>>,
    TError = null,
  >(
    fields: TShape,
    { error = null }: FormShapeOfOptions<TError> = {},
  ): FormShape<TShape, TError> {
    return new FormShape(fields, Sweety.of(error))
  }

  protected constructor(
    public readonly fields: TShape,
    private readonly error: Sweety<null | TError>,
  ) {}

  public getValue<TResult = UnpackFormShapeValue<TShape>>(
    // TODO not sure it is needed, anywhere
    select?: (shape: UnpackFormShapeValue<TShape>) => TResult,
  ): TResult {
    const acc = {} as UnpackFormShapeValue<TShape>
    const pairs = Object.entries(this.fields) as Array<
      [keyof TShape, SweetyForm<unknown, unknown>]
    >

    for (const [key, field] of pairs) {
      acc[key] = field.getValue()
    }

    return selectSafe(select, acc)
  }

  public getError<TResult = null | FormShapeError<TShape, TError>>(
    select?: (error: null | FormShapeError<TShape, TError>) => TResult,
  ): TResult {
    let hasFieldErrors = false
    const fields = {} as UnpackFormShapeError<TShape>
    const pairs = Object.entries(this.fields) as Array<
      [keyof TShape, SweetyForm<unknown, unknown>]
    >

    for (const [key, field] of pairs) {
      fields[key] = field.getError()
      hasFieldErrors = hasFieldErrors || fields[key] != null
    }

    const shapeError = this.error.getState()

    if (shapeError == null && !hasFieldErrors) {
      return selectSafe(select, null)
    }

    return selectSafe(select, {
      shape: shapeError as WhenUnknown<null, TError>,
      fields: hasFieldErrors ? fields : null,
    })
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

  protected constructor(
    private readonly items: Sweety<ReadonlyArray<TItem>>,
    private readonly error: Sweety<null | TError>,
  ) {}

  public getValue<TResult = ReadonlyArray<UnpackFormValue<TItem>>>(
    select?: (items: ReadonlyArray<UnpackFormValue<TItem>>) => TResult,
  ): TResult {
    return selectSafe(
      select,
      this.items.getState().map((item) => item.getValue()),
    )
  }

  public getError<TResult = null | FormListError<TItem, TError>>(
    select?: (error: null | FormListError<TItem, TError>) => TResult,
  ): TResult {
    let hasItemErrors = false
    const items = [] as Array<UnpackFormError<TItem>>

    for (const item of this.items.getState()) {
      items.push(item.getError())
      hasItemErrors = hasItemErrors || items.at(-1) != null
    }

    const listError = this.error.getState()

    if (listError == null && !hasItemErrors) {
      return selectSafe(select, null)
    }

    return selectSafe(select, {
      list: listError as WhenUnknown<null, TError>,
      items: hasItemErrors ? items : null,
    })
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

  public updateItems(
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    callback: (items: ReadonlyArray<TItem>) => void | ReadonlyArray<TItem>,
  ): void {
    this.items.setState((items) => {
      const nextItems = callback(items)

      return nextItems || items
    })
  }
}

const throwOnRenderCall: (...args: Array<never>) => unknown = () => {
  throw new Error("You can not call useEvent callback during render phase.")
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

// TODO change name, as well as SweetyForm#getValue #setValue
// it should not interfere with the FormValue
export function useGetFormValue<TValue, TResult = TValue>(
  form: SweetyForm<TValue, unknown>,
  select?: (value: TValue) => TResult,
  compare?: Compare<TResult>,
): TResult {
  return useWatchSweety(
    useCallback(() => form.getValue(select), [form, select]),
    compare,
  )
}

export function useGetFormError<TError, TResult = null | TError>(
  form: SweetyForm<unknown, TError>,
  select?: (error: null | TError) => TResult,
  compare?: Compare<TResult>,
): TResult {
  return useWatchSweety(
    useCallback(() => form.getError(select), [form, select]),
    compare,
  )
}

export interface UseFormValueOptions<TValue, TError = null, TResult = TValue> {
  compare?: Compare<TResult>
  select?: Transform<TValue, TResult>
  validate?: Validate<TValue, TError>
}

export function useFormValue<TValue, TError = null, TResult = TValue>(
  formValue: FormValue<TValue, TError>,
  {
    select,
    compare,
    validate = alwaysNull,
  }: UseFormValueOptions<TValue, TError, TResult> = {},
): [TResult, Dispatch<SetStateAction<TValue>>] {
  const value = useWatchSweety(
    useCallback(() => formValue.getValue(select), [formValue, select]),
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
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  Dispatch<(items: ReadonlyArray<TItem>) => void | ReadonlyArray<TItem>>,
] {
  const items = useWatchSweety(
    useCallback(() => formList.getItems(select), [formList, select]),
    compare,
  )
  const setItems = useEvent(
    (
      // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
      callback: (items: ReadonlyArray<TItem>) => void | ReadonlyArray<TItem>,
    ): void => {
      formList.updateItems(callback)
    },
  )

  return [items, setItems]
}

export type FormReValidateMode = "onChange" | "onBlur" | "onSubmit"

export type FormValidateMode = FormReValidateMode | "onTouched" | "all"

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

    const value: UnpackFormValue<TForm> = form.getValue()
    const error: null | UnpackFormError<TForm> = form.getError()

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
