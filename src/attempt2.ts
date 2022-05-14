import { SetStateAction } from "react"
import { Sweety } from "react-sweety"

type Compute<TObject> = {
  [TKey in keyof TObject]: TObject[TKey]
} & unknown

type WhenUnknown<TFallback, TValue> = unknown extends TValue
  ? TFallback
  : TValue

type Transform<TValue, TResult> = (value: TValue) => TResult

const selectSafe = <TValue, TResult = TValue>(
  select: undefined | Transform<TValue, TResult>,
  value: TValue,
): TResult => {
  return typeof select === "function"
    ? select(value)
    : (value as unknown as TResult)
}

export interface SweetyForm<TValue, TError = never> {
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
  TShape extends Record<string, SweetyForm<unknown, unknown>>,
> = Compute<{
  readonly [TKey in keyof TShape]: UnpackFormValue<TShape[TKey]>
}>

type UnpackFormError<TForm> = TForm extends FormValue<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  infer _TValue,
  infer TError
>
  ? WhenUnknown<never, TError>
  : TForm extends FormShape<infer TShape, infer TError>
  ? FormShapeError<TShape, TError>
  : TForm extends FormList<infer TItem, infer TError>
  ? FormListError<TItem, TError>
  : never

type UnpackFormShapeError<
  TShape extends Record<string, SweetyForm<unknown, unknown>>,
> = Compute<{
  readonly [TKey in keyof TShape]: null | UnpackFormError<TShape[TKey]>
}>

type FormShapeError<
  TShape extends Record<string, SweetyForm<unknown, unknown>>,
  TError = never,
> = Compute<{
  readonly shape: null | WhenUnknown<never, TError>
  readonly fields: null | UnpackFormShapeError<TShape>
}>

type FormListError<
  TItem extends SweetyForm<unknown, unknown>,
  TError = never,
> = Compute<{
  readonly list: null | WhenUnknown<never, TError>
  readonly items: null | ReadonlyArray<UnpackFormError<TItem>>
}>

// -------------------
// F O R M   V A L U E
// -------------------

interface FormValueOfOptions<TError = never> {
  error?: null | TError
}

export class FormValue<TValue, TError = never>
  implements SweetyForm<TValue, TError>
{
  public static of<TValue, TError = never>(
    value: TValue,
    { error = null }: FormValueOfOptions<TError> = {},
  ): FormValue<TValue, TError> {
    return new FormValue(Sweety.of(value), Sweety.of(error))
  }

  private constructor(
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

interface FormShapeOfOptions<TError = never> {
  error?: null | TError
}

export class FormShape<
  TShape extends Record<string, SweetyForm<unknown, unknown>>,
  TError = never,
> implements
    SweetyForm<UnpackFormShapeValue<TShape>, FormShapeError<TShape, TError>>
{
  public static of<
    TShape extends Record<string, SweetyForm<unknown, unknown>>,
    TError = never,
  >(
    fields: TShape,
    { error = null }: FormShapeOfOptions<TError> = {},
  ): FormShape<TShape, TError> {
    return new FormShape(fields, Sweety.of(error))
  }

  private constructor(
    private readonly fields: TShape,
    private readonly error: Sweety<null | TError>,
  ) {}

  public getValue<TResult = UnpackFormShapeValue<TShape>>(
    select?: (shape: UnpackFormShapeValue<TShape>) => TResult,
  ): TResult {
    const acc = {} as UnpackFormShapeValue<TShape>

    for (const [key, field] of Object.entries(this.fields)) {
      acc[key as keyof TShape] = field.getValue()
    }

    return selectSafe(select, acc)
  }

  public getError<TResult = null | FormShapeError<TShape, TError>>(
    select?: (error: null | FormShapeError<TShape, TError>) => TResult,
  ): TResult {
    let hasFieldErrors = false
    const fields = {} as UnpackFormShapeError<TShape>

    for (const [key, field] of Object.entries(this.fields)) {
      fields[key as keyof TShape] = field.getError()
      hasFieldErrors = hasFieldErrors || fields[key] != null
    }

    const shapeError = this.error.getState()

    if (shapeError == null && !hasFieldErrors) {
      return selectSafe(select, null)
    }

    return selectSafe(select, {
      shape: shapeError as WhenUnknown<never, TError>,
      fields: hasFieldErrors ? fields : null,
    })
  }

  public setShapeError(transform: (error: null | TError) => null | TError): void
  public setShapeError(error: null | TError): void
  public setShapeError(transformOrError: SetStateAction<null | TError>): void {
    this.error.setState(transformOrError)
  }

  public updateFields(callback: (fields: TShape) => void): void {
    callback(this.fields)
  }
}

interface FormListOfOptions<TError = never> {
  error?: null | TError
}

export class FormList<
  TItem extends SweetyForm<unknown, unknown>,
  TError = never,
> implements
    SweetyForm<
      ReadonlyArray<UnpackFormValue<TItem>>,
      FormListError<TItem, TError>
    >
{
  public static of<TItem extends SweetyForm<unknown, unknown>, TError = never>(
    items: ReadonlyArray<TItem>,
    { error = null }: FormListOfOptions<TError> = {},
  ): FormList<TItem, TError> {
    return new FormList(Sweety.of(items), Sweety.of(error))
  }

  private constructor(
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
      list: listError as WhenUnknown<never, TError>,
      items: hasItemErrors ? items : null,
    })
  }

  public update(
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    callback: (items: ReadonlyArray<TItem>) => void | ReadonlyArray<TItem>,
  ): void {
    this.items.getState((items) => {
      const nextItems = callback(items)

      return nextItems || items
    })
  }
}
