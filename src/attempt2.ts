type Compute<TObject> = {
  [TKey in keyof TObject]: TObject[TKey]
} & unknown

type WhenUnknown<TFallback, TValue> = unknown extends TValue
  ? TFallback
  : TValue

type Transform<TValue, TResult> = (value: TValue) => TResult

export interface SweetyForm<TValue, TError = never> {
  getValue<TResult = TValue>(select?: Transform<TValue, TResult>): TResult

  getError<TResult = null | TError>(
    select?: Transform<null | TError, TResult>,
  ): TResult
}

type UnpackFormValue<TForm> = TForm extends FormValue<infer TValue, unknown>
  ? TValue
  : TForm extends FormShape<infer TShape, unknown>
  ? UnpackFormShapeValue<TShape>
  : TForm extends FormList<infer TItem, unknown>
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

interface FormValueOfOptions<TValue, TError = never> {
  validate?: Transform<TValue, null | TError>
}

export class FormValue<TValue, TError = never>
  implements SweetyForm<TValue, TError>
{
  public static of<TValue, TError = never>(
    value: TValue,
    { validate }: FormValueOfOptions<TValue, TError> = {},
  ): FormValue<TValue, TError> {
    return new FormValue(value, validate)
  }

  private constructor(
    private readonly value: TValue,
    private readonly validate?: Transform<TValue, null | TError>,
  ) {}

  public getValue<TResult = TValue>(
    select?: Transform<TValue, TResult>,
  ): TResult {
    throw new Error(String(select))
  }

  public setValue(transform: Transform<TValue, TValue>): void
  public setValue(value: TValue): void
  public setValue(transformOrValue: TValue | Transform<TValue, TValue>): void {
    throw new Error(String(transformOrValue))
  }

  public getError<TResult = null | TError>(
    select?: Transform<null | TError, TResult>,
  ): TResult {
    throw new Error(select?.name)
  }

  public setError(transform: Transform<null | TError, null | Error>): void
  public setError(error: null | TError): void
  public setError(
    transformOrError: null | TError | Transform<null | TError, null | Error>,
  ): void {
    throw new Error(String(transformOrError))
  }
}

// -------------------
// F O R M   S H A P E
// -------------------

interface FormShapeOfOptions<
  TShape extends Record<string, SweetyForm<unknown, unknown>>,
  TError = never,
> {
  validate?: Transform<UnpackFormShapeValue<TShape>, null | TError>
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
    { validate }: FormShapeOfOptions<TShape, TError> = {},
  ): FormShape<TShape, TError> {
    return new FormShape(fields, validate)
  }

  private constructor(
    private readonly fields: TShape,
    private readonly validate?: Transform<
      UnpackFormShapeValue<TShape>,
      null | TError
    >,
  ) {}

  public getValue<TResult = UnpackFormShapeValue<TShape>>(
    select?: Transform<UnpackFormShapeValue<TShape>, TResult>,
  ): TResult {
    throw new Error(String(select))
  }

  public getError<TResult = null | FormShapeError<TShape, TError>>(
    select?: Transform<null | FormShapeError<TShape, TError>, TResult>,
  ): TResult {
    throw new Error(select?.name)
  }

  public update(callback: (fields: TShape) => void): void {
    callback(this.fields)
  }
}

interface FormListOfOptions<
  TItem extends SweetyForm<unknown, unknown>,
  TError = never,
> {
  validate?: Transform<ReadonlyArray<TItem>, null | TError>
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
    { validate }: FormListOfOptions<TItem, TError> = {},
  ): FormList<TItem, TError> {
    return new FormList(items, validate)
  }

  private constructor(
    private readonly items: ReadonlyArray<TItem>,
    private readonly validate?: Transform<ReadonlyArray<TItem>, null | TError>,
  ) {}

  public getValue<TResult = ReadonlyArray<UnpackFormValue<TItem>>>(
    select?: Transform<ReadonlyArray<UnpackFormValue<TItem>>, TResult>,
  ): TResult {
    throw new Error(String(select))
  }

  public getError<TResult = null | FormListError<TItem, TError>>(
    select?: Transform<null | FormListError<TItem, TError>, TResult>,
  ): TResult {
    throw new Error(select?.name)
  }

  public update(
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    callback: (items: ReadonlyArray<TItem>) => void | ReadonlyArray<TItem>,
  ): void {
    callback(this.items)
  }
}
