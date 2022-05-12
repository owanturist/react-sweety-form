import { SetStateAction } from "react"
import { Compare, Sweety } from "react-sweety"

const isArrayEqual = <T>(left: Array<T>, right: Array<T>): boolean => {
  if (left.length !== right.length) {
    return false
  }

  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) {
      return false
    }
  }

  return true
}

const identity = <T>(value: T): T => value

const alwaysEmptyArray = <T>(): Array<T> => []

type Validator<TValue, TError> = (value: TValue) => TError

interface SweetyForm<TValue, TError> {
  isTouched(): boolean
  setTouched(touchedOrTransform: SetStateAction<boolean>): void
  getValue<TResult = TValue>(transform?: (value: TValue) => TResult): TResult
  setValue(valueOrTransform: SetStateAction<TValue>): void
  getErrors<TResult = TError>(transform?: (error: TError) => TResult): TResult
  setErrors(errorsOrTransform: SetStateAction<TError>): void
  setValidator(validator: null | Validator<TValue, TError>): void
}

class SweetyFormValue<TValue, TError = never>
  implements SweetyForm<TValue, Array<TError>>
{
  public static of<TValue, TError = never>({
    value,
    validator = alwaysEmptyArray,
    compareValues,
  }: {
    value: TValue
    validator?: Validator<TValue, Array<TError>>
    compareValues?: Compare<TValue>
  }): SweetyFormValue<TValue, TError> {
    return new SweetyFormValue(
      value,
      Sweety.of(value, compareValues),
      Sweety.of(validator(value), isArrayEqual),
      Sweety.of(false),
      Sweety.of(validator),
    )
  }

  private constructor(
    private readonly initialValue: TValue,
    private readonly value: Sweety<TValue>,
    private readonly errors: Sweety<Array<TError>>,
    private readonly touched: Sweety<boolean>,
    private readonly validator: Sweety<Validator<TValue, Array<TError>>>,
  ) {}

  public isDirty(): boolean {
    return this.value.compare(this.initialValue, this.value.getState())
  }

  public isValid(): boolean {
    return this.errors.getState().length === 0
  }

  public isTouched(): boolean {
    return this.touched.getState()
  }

  public setTouched(touchedOrTransform: SetStateAction<boolean>): void {
    this.touched.setState(touchedOrTransform)
  }

  public getValue<TResult = TValue>(
    transform?: (value: TValue) => TResult,
  ): TResult {
    return this.value.getState(transform!)
  }

  public setValue(valueOrTransform: SetStateAction<TValue>): void {
    this.value.setState(valueOrTransform)
  }

  public getErrors<TResult = Array<TError>>(
    transform?: (errors: Array<TError>) => TResult,
  ): TResult {
    return this.errors.getState(transform!)
  }

  public setErrors(errorsOrTransform: SetStateAction<Array<TError>>): void {
    this.errors.setState(errorsOrTransform)
  }

  public setValidator(
    validator: null | Validator<TValue, Array<TError>>,
  ): void {
    this.validator.setState(validator ?? alwaysEmptyArray)
  }

  public clone(
    transformValue?: (value: TValue) => TValue,
    transformError: (error: TError) => TError = identity,
  ): SweetyFormValue<TValue, TError> {
    return new SweetyFormValue(
      this.initialValue,
      this.value.clone(transformValue),
      this.errors.clone((errors) => errors.map(transformError)),
      this.touched.clone(),
      this.validator.clone(),
    )
  }
}

class SweetyFormShape<
  TShape extends Record<string, SweetyForm<unknown, unknown>>,
> implements SweetyForm<TShape, GetShapeError<TShape>>
{
  public constructor(private readonly shape: TShape) {}

  public isTouched(
    select?: (shape: ConvertToBooleanShape<this>) => boolean,
  ): boolean {
    throw new Error("")
  }

  public setTouched(): void {
    throw new Error("")
  }

  public getValue<TResult>(): TResult {
    throw new Error("")
  }

  public setValue(): void {
    throw new Error("")
  }

  public getErrors<TResult = GetShapeError<TShape>>(
    transform?: (errors: GetShapeError<TShape>) => TResult,
  ): TResult {
    throw new Error("")
  }

  public setErrors(): void {
    throw new Error("")
  }

  public setValidator(): void {
    throw new Error("")
  }

  public clone(): SweetyFormShape<TShape> {
    throw new Error("")
  }
}

type ConvertToBooleanShape<TForm> = TForm extends SweetyFormShape<infer TShape>
  ? Compute<{
      [TKey in keyof TShape]: ConvertToBooleanShape<TShape[TKey]>
    }>
  : boolean

type GetShapeError<TShape> = Compute<{
  [TKey in keyof TShape]: TShape[TKey] extends SweetyForm<unknown, infer TError>
    ? TError
    : never
}>

type Compute<TObject> = {
  [TKey in keyof TObject]: TObject[TKey]
} & unknown

const foo = new SweetyFormShape({
  first: SweetyFormValue.of({ value: "foo", validator: () => [false] }),
  second: SweetyFormValue.of({ value: 123, validator: () => [""] }),
  third: new SweetyFormShape({
    fourth: SweetyFormValue.of({ value: false, validator: () => [123] }),
    fifth: new SweetyFormShape({
      sixth: SweetyFormValue.of({ value: "bar", validator: () => ["123"] }),
    }),
  }),
})

export const useSweetyForm = (): void => {
  // do nothing
}

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------

type Maybe<T> = undefined | null | T

interface IFoo<TValue, TError> {
  getValue<TResult = TValue>(select?: (value: TValue) => TResult): TResult

  setValue(value: SetStateAction<TValue>): void

  getError<TResult = Maybe<TError>>(
    select?: (error: Maybe<TError>) => TResult,
  ): TResult

  setError(error: SetStateAction<Maybe<TError>>): void
}

class FooValue<TValue, TError = never> implements IFoo<TValue, TError> {
  public constructor(
    private readonly value: TValue,
    private readonly validate?: (value: TValue) => Maybe<TError>,
  ) {}

  public getValue<TResult = TValue>(
    select?: (value: TValue) => TResult,
  ): TResult {
    throw new Error(select?.name)
  }

  public setValue(value: SetStateAction<TValue>): void {
    throw new Error(String(value))
  }

  public getError<TResult = Maybe<TError>>(
    select?: (error: Maybe<TError>) => TResult,
  ): TResult {
    throw new Error(select?.name)
  }

  public setError(error: SetStateAction<Maybe<TError>>): void {
    throw new Error(String(error))
  }
}

type UnpackShape<TShape extends Record<string, IFoo<unknown, unknown>>> =
  Compute<{
    [TKey in keyof TShape]: TShape[TKey] extends IFoo<infer TValue, unknown>
      ? TValue
      : never
  }>

type UnpackShapeError<TShape extends Record<string, IFoo<unknown, unknown>>> =
  Compute<{
    [TKey in keyof TShape]?: TShape[TKey] extends IFoo<unknown, infer TError>
      ? null | TError
      : never
  }>

interface ShapeError<
  TShape extends Record<string, IFoo<unknown, unknown>>,
  TError,
> {
  shape: Maybe<TError>
  fields: UnpackShapeError<TShape>
}

class FooShape<
  TShape extends Record<string, IFoo<unknown, unknown>>,
  TError = never,
> implements IFoo<UnpackShape<TShape>, ShapeError<TShape, TError>>
{
  public constructor(
    private readonly shape: TShape,
    private readonly validate?: (shape: UnpackShape<TShape>) => Maybe<TError>,
  ) {}

  public getValue<TResult = UnpackShape<TShape>>(
    select?: (value: UnpackShape<TShape>) => TResult,
  ): TResult {
    throw new Error(select?.name)
  }

  public setValue(value: SetStateAction<UnpackShape<TShape>>): void {
    throw new Error(String(value))
  }

  public getError<TResult = Maybe<ShapeError<TShape, TError>>>(
    select?: (error: Maybe<ShapeError<TShape, TError>>) => TResult,
  ): TResult {
    throw new Error(select?.name)
  }

  public setError(
    error: SetStateAction<Maybe<ShapeError<TShape, TError>>>,
  ): void {
    throw new Error(String(error))
  }
}

type UnpackList<TList extends Array<IFoo<unknown, unknown>>> =
  TList extends Array<IFoo<infer TValue, unknown>>
    ? ReadonlyArray<TValue>
    : never

type UnpackListError<TList extends Array<IFoo<unknown, unknown>>> =
  TList extends Array<IFoo<unknown, infer TError>>
    ? ReadonlyArray<null | TError>
    : never

type ListError<TList extends Array<IFoo<unknown, unknown>>, TError> = {
  list: Maybe<TError>
  items: UnpackListError<TList>
}

class FooList<TList extends Array<IFoo<unknown, unknown>>, TError = never>
  implements IFoo<UnpackList<TList>, ListError<TList, TError>>
{
  public constructor(
    private readonly list: TList,
    private readonly validate?: (items: UnpackList<TList>) => Maybe<TError>,
  ) {}

  public getValue<TResult = UnpackList<TList>>(
    select?: (value: UnpackList<TList>) => TResult,
  ): TResult {
    throw new Error(select?.name)
  }

  public setValue(value: SetStateAction<UnpackList<TList>>): void {
    throw new Error(String(value))
  }

  public getError<TResult = Maybe<ListError<TList, TError>>>(
    select?: (error: Maybe<ListError<TList, TError>>) => TResult,
  ): TResult {
    throw new Error(select?.name)
  }

  public setError(
    error: SetStateAction<Maybe<ListError<TList, TError>>>,
  ): void {
    throw new Error(String(error))
  }
}

const kk = new FooValue("hi", (value) => value.length > 0)
const ka = new FooValue(123)

const ll = new FooList(
  [
    new FooShape({
      foo: new FooValue(false),
      bar: new FooValue("false"),
      ak: kk,
    }),
  ],
  (x) => x.at(0)?.bar,
)

const foo1 = new FooShape(
  {
    bar: kk,
    baz: ka,
    fos: new FooShape({
      foo: new FooValue([false]),
      akl: ka,
    }),
    asd: ll,
  },
  (x) => (x.baz > 10 ? "not valid" : null),
)

const err1 = foo1.getError((x) => x?.fields.asd?.items.at(0)?.fields.ak)

const ba = foo1.getValue((x) => x.asd[0]?.bar)

foo1.setValue((x) => ({
  ...x,
  bar: ba ?? "",
}))

foo1.setValue((x) => ({
  ...x,
  bar: "123",
}))

foo1.setError(
  (x) =>
    x && {
      ...x,
      fields: {
        ...x.fields,
        bar: false,
      },
    },
)
