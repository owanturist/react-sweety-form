type Compute<TObject> = {
  [TKey in keyof TObject]: TObject[TKey]
} & unknown

type Nullable<T> = null | T

type WhenUnknown<TFallback, TValue> = unknown extends TValue
  ? TFallback
  : TValue

type Transform<TValue, TResult = TValue> = (value: TValue) => TResult

interface SweetyFormOptions {
  setValue: unknown
  getValue: unknown
  getError: unknown
  setError: unknown
}

interface SweetyForm<TOptions extends SweetyFormOptions = SweetyFormOptions> {
  getValue<TResult = TOptions["getValue"]>(
    select?: Transform<TOptions["getValue"], TResult>,
  ): TResult

  setValue(value: TOptions["setValue"]): void

  getError<TResult = Nullable<TOptions["getError"]>>(
    select?: Transform<Nullable<TOptions["getError"]>, TResult>,
  ): TResult

  setError(error: Nullable<TOptions["setError"]>): void
}

type UnpackFormValue<TForm> = TForm extends FormValue<infer TValue, unknown>
  ? // should prevent the mutation
    Readonly<TValue>
  : TForm extends SweetyForm<infer TOptions>
  ? TOptions["getValue"]
  : never

type UnpackFormError<TForm> = TForm extends FormValue<unknown, infer TError>
  ? // should prevent the mutation
    Nullable<Readonly<TError>>
  : TForm extends SweetyForm<infer TOptions>
  ? WhenUnknown<null, TOptions["getError"]>
  : never

// -------------------
// F O R M   V A L U E
// -------------------

interface FormValueOfOptions<TValue, TError = never> {
  validate?: Transform<TValue, Nullable<TError>>
}

export class FormValue<TValue, TError = never>
  implements
    SweetyForm<{
      getValue: TValue
      setValue: TValue
      getError: TError
      setError: TError
    }>
{
  public static of<TValue, TError = never>(
    value: TValue,
    { validate }: FormValueOfOptions<TValue, TError> = {},
  ): FormValue<TValue, TError> {
    return new FormValue(value, validate)
  }

  private constructor(
    private readonly value: TValue,
    private readonly validate?: Transform<TValue, Nullable<TError>>,
  ) {}

  public getValue<TResult = TValue>(
    select?: Transform<TValue, TResult>,
  ): TResult {
    throw new Error(select?.name)
  }

  public setValue(transform: Transform<TValue>): void
  public setValue(value: TValue): void
  public setValue(transformOrValue: TValue | Transform<TValue>): void {
    throw new Error(String(transformOrValue))
  }

  public getError<TResult = Nullable<TError>>(
    select?: Transform<Nullable<TError>, TResult>,
  ): TResult {
    throw new Error(select?.name)
  }

  public setError(transform: Transform<Nullable<TError>>): void
  public setError(error: Nullable<TError>): void
  public setError(
    transformOrError: Nullable<TError> | Transform<Nullable<TError>>,
  ): void {
    throw new Error(String(transformOrError))
  }
}

// -------------------
// F O R M   S H A P E
// -------------------

type UnpackFormShape<TShape extends Record<string, SweetyForm>> = Compute<{
  readonly [TKey in keyof TShape]: UnpackFormValue<TShape[TKey]>
}>

type UnpackFormShapeGetError<TShape extends Record<string, SweetyForm>> =
  Compute<{
    readonly [TKey in keyof TShape]: UnpackFormError<TShape[TKey]>
  }>

interface FormShapeGetError<TShape extends Record<string, SweetyForm>, TError> {
  readonly shape: Nullable<TError>
  readonly fields: UnpackFormShapeGetError<TShape>
}

type UnpackFormShapeSetError<TShape extends Record<string, SweetyForm>> =
  Compute<{
    readonly [TKey in keyof TShape]?: Nullable<UnpackFormError<TShape[TKey]>>
  }>

interface FormShapeSetError<TShape extends Record<string, SweetyForm>, TError> {
  readonly shape?: Nullable<TError>
  readonly fields?: Nullable<UnpackFormShapeSetError<TShape>>
}

interface FormShapeOfOptions<
  TShape extends Record<string, SweetyForm>,
  TError = never,
> {
  validate?: Transform<UnpackFormShape<TShape>, Nullable<TError>>
}

export class FormShape<
  TShape extends Record<string, SweetyForm>,
  TError = never,
> implements
    SweetyForm<{
      getValue: UnpackFormShape<TShape>
      setValue(shape: Readonly<TShape>): void
      getError: FormShapeSetError<TShape, TError>
      setError: FormShapeSetError<TShape, TError>
    }>
{
  public static of<TShape extends Record<string, SweetyForm>, TError = never>(
    shape: TShape,
    { validate }: FormShapeOfOptions<TShape, TError> = {},
  ): FormShape<TShape, TError> {
    return new FormShape(shape, validate)
  }

  private constructor(
    private readonly shape: TShape,
    private readonly validate?: Transform<
      UnpackFormShape<TShape>,
      Nullable<TError>
    >,
  ) {}

  public getValue<TResult = UnpackFormShape<TShape>>(
    select?: Transform<UnpackFormShape<TShape>, TResult>,
  ): TResult {
    throw new Error(select?.name)
  }

  public setValue(setter: (shape: Readonly<TShape>) => void): void {
    throw new Error(String(setter))
  }

  public getError<TResult = Nullable<FormShapeSetError<TShape, TError>>>(
    select?: Transform<Nullable<FormShapeSetError<TShape, TError>>, TResult>,
  ): TResult {
    throw new Error(select?.name)
  }

  public setError(
    transform: Transform<
      FormShapeGetError<TShape, TError>,
      Nullable<FormShapeSetError<TShape, TError>>
    >,
  ): void
  public setError(error: Nullable<FormShapeSetError<TShape, TError>>): void
  public setError(
    transformOrError:
      | Nullable<FormShapeSetError<TShape, TError>>
      | Transform<
          FormShapeGetError<TShape, TError>,
          Nullable<FormShapeSetError<TShape, TError>>
        >,
  ): void {
    throw new Error(String(transformOrError))
  }
}

// -----------------
// F O R M   L I S T
// -----------------

type UnpackFormList<TList extends ReadonlyArray<SweetyForm>> =
  TList extends ReadonlyArray<infer TItem>
    ? ReadonlyArray<UnpackFormValue<TItem>>
    : never

type UnpackFormListGetError<TList extends ReadonlyArray<SweetyForm>> =
  TList extends ReadonlyArray<infer TItem>
    ? ReadonlyArray<UnpackFormError<TItem>>
    : never

type FormListGetError<TList extends ReadonlyArray<SweetyForm>, TError> = {
  readonly list: Nullable<TError>
  readonly items: UnpackFormListGetError<TList>
}

type UnpackFormListSetError<TList extends ReadonlyArray<SweetyForm>> =
  TList extends ReadonlyArray<infer TItem>
    ? ReadonlyArray<Nullable<UnpackFormError<TItem>>>
    : never

type FormListSetError<TList extends ReadonlyArray<SweetyForm>, TError> = {
  readonly list?: Nullable<TError>
  readonly items?: Nullable<UnpackFormListSetError<TList>>
}

interface FormListOfOptions<
  TList extends ReadonlyArray<SweetyForm>,
  TError = never,
> {
  validate?: Transform<UnpackFormList<TList>, Nullable<TError>>
}

export class FormList<
  TList extends ReadonlyArray<SweetyForm>,
  TError = never,
> implements
    SweetyForm<{
      getValue: UnpackFormList<TList>
      setValue(list: Readonly<TList>): void
      getError: FormListSetError<TList, TError>
      setError: FormListSetError<TList, TError>
    }>
{
  public static of<TList extends ReadonlyArray<SweetyForm>, TError = never>(
    list: TList,
    { validate }: FormListOfOptions<TList, TError> = {},
  ): FormList<TList, TError> {
    return new FormList(list, validate)
  }

  private constructor(
    private readonly list: TList,
    private readonly validate?: Transform<
      UnpackFormList<TList>,
      Nullable<TError>
    >,
  ) {}

  public getValue<TResult = UnpackFormList<TList>>(
    select?: Transform<UnpackFormList<TList>, TResult>,
  ): TResult {
    throw new Error(select?.name)
  }

  public setValue(setter: (list: Readonly<TList>) => void): void {
    throw new Error(String(setter))
  }

  public getError<TResult = Nullable<FormListSetError<TList, TError>>>(
    select?: Transform<Nullable<FormListSetError<TList, TError>>, TResult>,
  ): TResult {
    throw new Error(select?.name)
  }

  public setError(
    transform: Transform<
      FormListGetError<TList, TError>,
      Nullable<FormListSetError<TList, TError>>
    >,
  ): void
  public setError(error: Nullable<FormListSetError<TList, TError>>): void
  public setError(
    transformOrError:
      | Nullable<FormListSetError<TList, TError>>
      | Transform<
          FormListGetError<TList, TError>,
          Nullable<FormListSetError<TList, TError>>
        >,
  ): void {
    throw new Error(String(transformOrError))
  }
}
