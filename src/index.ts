type Compute<TObject> = {
  [TKey in keyof TObject]: TObject[TKey]
} & unknown

type Nullable<T> = null | T

type WhenUnknown<TFallback, TValue> = unknown extends TValue
  ? TFallback
  : TValue

type Transform<TValue, TResult = TValue> = (value: TValue) => TResult

interface SweetyForm<TValue, TError> {
  getValue<TResult = TValue>(select?: Transform<TValue, TResult>): TResult

  setValue(value: TValue): void

  getError<TResult = Nullable<TError>>(
    select?: Transform<Nullable<TError>, TResult>,
  ): TResult

  setError(error: Nullable<TError>): void
}

type UnpackFormValue<TForm> = TForm extends FormValue<infer TValue, unknown>
  ? // should prevent the mutation
    Readonly<TValue>
  : TForm extends SweetyForm<infer TValue, unknown>
  ? TValue
  : never

type UnpackFormError<TForm> = TForm extends FormValue<unknown, infer TError>
  ? // should prevent the mutation
    Nullable<Readonly<TError>>
  : TForm extends SweetyForm<unknown, infer TError>
  ? WhenUnknown<null, TError>
  : never

export class FormValue<TValue, TError = never>
  implements SweetyForm<TValue, TError>
{
  public constructor(
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

type UnpackFormShape<
  TShape extends Record<string, SweetyForm<unknown, unknown>>,
> = Compute<{
  readonly [TKey in keyof TShape]: UnpackFormValue<TShape[TKey]>
}>

type UnpackFormShapeGetError<
  TShape extends Record<string, SweetyForm<unknown, unknown>>,
> = Compute<{
  readonly [TKey in keyof TShape]: UnpackFormError<TShape[TKey]>
}>

interface FormShapeGetError<
  TShape extends Record<string, SweetyForm<unknown, unknown>>,
  TError,
> {
  readonly shape: Nullable<TError>
  readonly fields: UnpackFormShapeGetError<TShape>
}

type UnpackFormShapeSetError<
  TShape extends Record<string, SweetyForm<unknown, unknown>>,
> = Compute<{
  readonly [TKey in keyof TShape]?: Nullable<UnpackFormError<TShape[TKey]>>
}>

interface FormShapeSetError<
  TShape extends Record<string, SweetyForm<unknown, unknown>>,
  TError,
> {
  readonly shape?: Nullable<TError>
  readonly fields?: Nullable<UnpackFormShapeSetError<TShape>>
}

export class FormShape<
  TShape extends Record<string, SweetyForm<unknown, unknown>>,
  TError = never,
> implements
    SweetyForm<UnpackFormShape<TShape>, FormShapeSetError<TShape, TError>>
{
  public constructor(
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

  public setValue(transform: Transform<UnpackFormShape<TShape>>): void
  public setValue(value: UnpackFormShape<TShape>): void
  public setValue(
    transformOrShape:
      | UnpackFormShape<TShape>
      | Transform<UnpackFormShape<TShape>>,
  ): void {
    throw new Error(String(transformOrShape))
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

type UnpackFormList<TList extends ReadonlyArray<SweetyForm<unknown, unknown>>> =
  TList extends ReadonlyArray<infer TItem>
    ? ReadonlyArray<UnpackFormValue<TItem>>
    : never

type UnpackFormListGetError<
  TList extends ReadonlyArray<SweetyForm<unknown, unknown>>,
> = TList extends ReadonlyArray<infer TItem>
  ? ReadonlyArray<UnpackFormError<TItem>>
  : never

type FormListGetError<
  TList extends ReadonlyArray<SweetyForm<unknown, unknown>>,
  TError,
> = {
  readonly list: Nullable<TError>
  readonly items: UnpackFormListGetError<TList>
}

type UnpackFormListSetError<
  TList extends ReadonlyArray<SweetyForm<unknown, unknown>>,
> = TList extends ReadonlyArray<infer TItem>
  ? ReadonlyArray<Nullable<UnpackFormError<TItem>>>
  : never

type FormListSetError<
  TList extends ReadonlyArray<SweetyForm<unknown, unknown>>,
  TError,
> = {
  readonly list?: Nullable<TError>
  readonly items?: Nullable<UnpackFormListSetError<TList>>
}

export class FormList<
  TList extends ReadonlyArray<SweetyForm<unknown, unknown>>,
  TError = never,
> implements SweetyForm<UnpackFormList<TList>, FormListSetError<TList, TError>>
{
  public constructor(
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

  public setValue(transform: Transform<UnpackFormList<TList>>): void
  public setValue(list: UnpackFormList<TList>): void
  public setValue(
    transformOrList: UnpackFormList<TList> | Transform<UnpackFormList<TList>>,
  ): void {
    throw new Error(String(transformOrList))
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
