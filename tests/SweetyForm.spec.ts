import { FormField, FormShape, FormList } from "../src"

describe("FormValue#getValue()", () => {
  it.concurrent("returns the stored value", () => {
    const value = {
      foo: "bar",
    }

    expect(FormField.of(value).getValue()).toBe(value)
  })

  it.concurrent("returns the selected value", () => {
    const value = {
      foo: "bar",
    }
    const formValue = FormField.of(value)

    expect(formValue.getValue()).toBe(value)
  })
})

describe("FormValue#setValue()", () => {
  it.concurrent("replaces the stored value", () => {
    const formValue = FormField.of({ foo: "bar" })
    const nextValue = {
      foo: "baz",
    }

    formValue.setValue(nextValue)

    expect(formValue.getValue()).toBe(nextValue)
  })

  it.concurrent("provides the stored value to transform", () => {
    const formValue = FormField.of(0)

    formValue.setValue((x) => x + 1)

    expect(formValue.getValue()).toBe(1)
  })
})

describe("FormValue#getError()", () => {
  it.concurrent("returns null when stored is not stored", () => {
    expect(FormField.of({}).getError()).toBeNull()
  })

  it.concurrent("returns the stored error", () => {
    const error = {
      foo: "bar",
    }

    expect(FormField.of({}, { error }).getError()).toBe(error)
  })

  it.concurrent("returns the selected error", () => {
    const error = {
      foo: "bar",
    }
    const formValue = FormField.of({}, { error })

    expect(formValue.getError()).toBe(error)
  })

  it.concurrent("returns null when selecting not stored error", () => {
    const formValue = FormField.of<string, { foo: string }>("")

    expect(formValue.getError()).toBeNull()
  })
})

describe("FormValue#setError()", () => {
  it.concurrent("replaces the stored error", () => {
    const formValue = FormField.of({}, { error: { foo: "bar" } })
    const nextError = {
      foo: "baz",
    }

    formValue.setError(nextError)

    expect(formValue.getError()).toBe(nextError)
  })

  it.concurrent("provides the stored error to transform", () => {
    const formValue = FormField.of({}, { error: 0 })

    formValue.setError((x) => (x ?? -1) + 1)

    expect(formValue.getError()).toBe(1)
  })

  it.concurrent("provides null when error is not stored", () => {
    const formValue = FormField.of<string, number>("")

    formValue.setError((x) => (x ?? -1) + 1)

    expect(formValue.getError()).toBe(0)
  })
})

describe("FormShape#getValue()", () => {
  it.concurrent("returns shape of FormValue", () => {
    const foo = FormField.of("foo")
    const bar = FormField.of("bar")
    const form = FormShape.of({ foo, bar })

    expect(form.getValue()).toStrictEqual({
      foo: "foo",
      bar: "bar",
    })

    foo.setValue("foo1")
    expect(form.getValue()).toStrictEqual({
      foo: "foo1",
      bar: "bar",
    })

    bar.setValue((x) => x + "2")
    expect(form.getValue()).toStrictEqual({
      foo: "foo1",
      bar: "bar2",
    })
  })

  it.concurrent("returns selected shape of FormValue", () => {
    const fooValue = { baz: 1 }
    const foo = FormField.of(fooValue)
    const bar = FormField.of("bar")
    const form = FormShape.of({ foo, bar })

    expect(form.getValue()).toStrictEqual({
      foo: { baz: 1 },
      bar: "bar",
    })
    expect(form.getValue().foo).toBe(fooValue)

    foo.setValue((x) => ({ ...x, baz: x.baz + 1 }))
    expect(form.getValue()).toStrictEqual({
      foo: { baz: 2 },
      bar: "bar",
    })
    expect(form.getValue().foo).not.toBe(fooValue)

    bar.setValue("bar2")
    expect(form.getValue()).toStrictEqual({
      foo: { baz: 2 },
      bar: "bar2",
    })
  })

  it.concurrent("returns nested FormShape", () => {
    const foo = FormShape.of({
      bar: FormField.of(1),
    })

    const baz = FormShape.of({
      baz: FormField.of("baz"),
      foo,
    })

    expect(baz.getValue()).toStrictEqual({
      baz: "baz",
      foo: {
        bar: 1,
      },
    })
  })

  it.concurrent("returns nested FormList", () => {
    const foo = FormList.of([FormField.of(1), FormField.of(2)])

    const baz = FormShape.of({
      baz: FormField.of("baz"),
      foo,
    })

    expect(baz.getValue()).toStrictEqual({
      baz: "baz",
      foo: [1, 2],
    })
  })
})

describe("FormShape#getError()", () => {
  it.concurrent(
    "returns null when neither fields nor shape don't have errors",
    () => {
      const form = FormShape.of({
        foo: FormField.of("foo"),
        bar: FormField.of("bar"),
      })

      expect(form.getError()).toBeNull()
    },
  )

  it.concurrent(
    "returns fields:null when fields don't have errors but shape does",
    () => {
      const form = FormShape.of(
        {
          foo: FormField.of("foo"),
          bar: FormField.of("bar"),
        },
        { error: "err" },
      )

      expect(form.getError()).toStrictEqual({
        shape: "err",
        fields: null,
      })
    },
  )

  it.concurrent("returns both shape and fields errors", () => {
    const form = FormShape.of(
      {
        foo: FormField.of("foo", { error: 1 }),
        bar: FormField.of("bar", { error: "1" }),
      },
      { error: "err" },
    )

    expect(form.getError()).toStrictEqual({
      shape: "err",
      fields: {
        foo: 1,
        bar: "1",
      },
    })
  })

  it.concurrent("returns selected error", () => {
    const foo = FormField.of("foo", { error: 1 })
    const bar = FormField.of("bar", { error: "1" })
    const form = FormShape.of({ foo, bar }, { error: "err" })

    expect(form.getError()).toStrictEqual({
      shape: "err",
      fields: {
        foo: 1,
        bar: "1",
      },
    })

    foo.setError(2)
    expect(form.getError()).toStrictEqual({
      shape: "err",
      fields: {
        foo: 2,
        bar: "1",
      },
    })

    bar.setError(null)
    expect(form.getError()).toStrictEqual({
      shape: "err",
      fields: {
        foo: 2,
        bar: null,
      },
    })

    foo.setError(null)
    expect(form.getError()).toStrictEqual({
      shape: "err",
      fields: null,
    })

    form.setShapeError((x) => (x ?? "") + "2")
    expect(form.getError()).toStrictEqual({
      shape: "err2",
      fields: null,
    })

    form.setShapeError(null)
    expect(form.getError()).toBeNull()
  })

  it.concurrent("returns fields:null when shape is empty", () => {
    const form = FormShape.of({}, { error: "err" })

    expect(form.getError()).toStrictEqual({
      shape: "err",
      fields: null,
    })
  })

  it.concurrent("returns nested FormShape errors", () => {
    const foo = FormShape.of(
      {
        bar: FormField.of(1, { error: false }),
        baz: FormField.of(2),
      },
      { error: "foo" },
    )

    const baz = FormShape.of(
      {
        baz: FormField.of("baz", { error: 1 }),
        foo,
      },
      { error: "baz" },
    )

    expect(baz.getError()).toStrictEqual({
      shape: "baz",
      fields: {
        baz: 1,
        foo: {
          shape: "foo",
          fields: {
            bar: false,
            baz: null,
          },
        },
      },
    })
  })

  it.concurrent("returns nested FormList errors", () => {
    const foo = FormList.of(
      [FormField.of(1), FormField.of(2, { error: "2" })],
      { error: "foo" },
    )

    const baz = FormShape.of(
      {
        baz: FormField.of("baz", { error: 1 }),
        foo,
      },
      { error: "baz" },
    )

    expect(baz.getError()).toStrictEqual({
      shape: "baz",
      fields: {
        baz: 1,
        foo: {
          list: "foo",
          items: [null, "2"],
        },
      },
    })
  })
})

describe("FormShape#fields", () => {
  it.concurrent("updates fields' values", () => {
    const form = FormShape.of({
      foo: FormField.of("foo"),
      bar: FormField.of("bar"),
    })

    expect(form.getValue()).toStrictEqual({
      foo: "foo",
      bar: "bar",
    })

    form.fields.foo.setValue("foo1")
    expect(form.getValue()).toStrictEqual({
      foo: "foo1",
      bar: "bar",
    })

    form.fields.bar.setValue((y) => y + "2")
    expect(form.getValue()).toStrictEqual({
      foo: "foo1",
      bar: "bar2",
    })
  })

  it.concurrent("updates fields' errors", () => {
    const form = FormShape.of(
      {
        foo: FormField.of("foo", { error: 1 }),
        bar: FormField.of("bar", { error: "1" }),
      },
      { error: "err" },
    )

    form.fields.foo.setError(2)
    expect(form.getError()).toStrictEqual({
      shape: "err",
      fields: {
        foo: 2,
        bar: "1",
      },
    })

    form.fields.foo.setError(null)
    expect(form.getError()).toStrictEqual({
      shape: "err",
      fields: {
        foo: null,
        bar: "1",
      },
    })

    form.fields.bar.setError(null)
    expect(form.getError()).toStrictEqual({
      shape: "err",
      fields: null,
    })
  })
})

describe("FormList#getValue()", () => {
  it.concurrent("returns items of FormValue", () => {
    const foo = FormField.of("foo")
    const bar = FormField.of("bar")
    const form = FormList.of([foo, bar])

    expect(form.getValue()).toStrictEqual(["foo", "bar"])

    foo.setValue("foo1")
    expect(form.getValue()).toStrictEqual(["foo1", "bar"])

    bar.setValue((x) => x + "2")
    expect(form.getValue()).toStrictEqual(["foo1", "bar2"])
  })

  it.concurrent("returns selected items of FormValue", () => {
    const fooValue = { baz: 1 }
    const barValue = { baz: 2 }
    const foo = FormField.of(fooValue)
    const bar = FormField.of(barValue)
    const form = FormList.of([foo, bar])

    expect(form.getValue()).toStrictEqual([{ baz: 1 }, { baz: 2 }])
    expect(form.getValue().at(0)).toBe(fooValue)
    expect(form.getValue().at(1)).toBe(barValue)

    foo.setValue((x) => ({ ...x, baz: x.baz + 2 }))
    expect(form.getValue()).toStrictEqual([{ baz: 3 }, { baz: 2 }])
    expect(form.getValue().at(0)).not.toBe(fooValue)
    expect(form.getValue().at(1)).toBe(barValue)

    bar.setValue({ baz: 4 })
    expect(form.getValue()).toStrictEqual([{ baz: 3 }, { baz: 4 }])
    expect(form.getValue().at(1)).not.toBe(barValue)
  })

  it.concurrent("returns nested FormShape", () => {
    const baz = FormList.of([
      FormShape.of({
        bar: FormField.of(1),
      }),
      FormShape.of({
        bar: FormField.of(2),
      }),
    ])

    expect(baz.getValue()).toStrictEqual([{ bar: 1 }, { bar: 2 }])
  })

  it.concurrent("returns nested FormList", () => {
    const baz = FormList.of([
      FormList.of([FormField.of(1), FormField.of(2)]),
      FormList.of([FormField.of(3), FormField.of(4)]),
    ])

    expect(baz.getValue()).toStrictEqual([
      [1, 2],
      [3, 4],
    ])
  })
})

describe("FormList#getError()", () => {
  it.concurrent(
    "returns null when neither fields nor shape don't have errors",
    () => {
      const form = FormList.of([FormField.of("foo"), FormField.of("bar")])

      expect(form.getError()).toBeNull()
    },
  )

  it.concurrent(
    "returns items:null when items don't have errors but list does",
    () => {
      const form = FormList.of([FormField.of("foo"), FormField.of("bar")], {
        error: "err",
      })

      expect(form.getError()).toStrictEqual({
        list: "err",
        items: null,
      })
    },
  )

  it.concurrent("returns both list and items errors", () => {
    const foo = FormField.of("foo", { error: 1 })
    const bar = FormField.of("bar", { error: 2 })
    const form = FormList.of([foo, bar], { error: "err" })

    expect(form.getError()).toStrictEqual({
      list: "err",
      items: [1, 2],
    })
  })

  it.concurrent("returns selected error", () => {
    const foo = FormField.of("foo", { error: 1 })
    const bar = FormField.of("bar", { error: 2 })
    const form = FormList.of([foo, bar], { error: "err" })

    expect(form.getError()).toStrictEqual({
      list: "err",
      items: [1, 2],
    })

    foo.setError(3)
    expect(form.getError()).toStrictEqual({
      list: "err",
      items: [3, 2],
    })

    bar.setError(null)
    expect(form.getError()).toStrictEqual({
      list: "err",
      items: [3, null],
    })

    foo.setError(null)
    expect(form.getError()).toStrictEqual({
      list: "err",
      items: null,
    })

    form.setListError((x) => (x ?? "") + "2")
    expect(form.getError()).toStrictEqual({
      list: "err2",
      items: null,
    })

    form.setListError(null)
    expect(form.getError()).toBeNull()
  })

  it.concurrent("returns items:null when shape is empty", () => {
    const form = FormList.of([], { error: "err" })

    expect(form.getError()).toStrictEqual({
      list: "err",
      items: null,
    })
  })

  it.concurrent("returns nested FormShape errors", () => {
    const foo = FormShape.of(
      {
        bar: FormField.of(1, { error: false }),
        baz: FormField.of(2),
      },
      { error: "foo" },
    )

    const baz = FormList.of(
      [
        foo,
        FormShape.of({
          bar: FormField.of(3),
          baz: FormField.of(4),
        }),
      ],
      { error: "baz" },
    )

    expect(baz.getError()).toStrictEqual({
      list: "baz",
      items: [
        {
          shape: "foo",
          fields: {
            bar: false,
            baz: null,
          },
        },
        null,
      ],
    })
  })

  it.concurrent("returns nested FormList errors", () => {
    const foo = FormList.of(
      [FormField.of(3), FormField.of(4, { error: "2" })],
      { error: "foo" },
    )

    const baz = FormList.of(
      [FormList.of([FormField.of(1), FormField.of(2)]), foo],
      { error: "baz" },
    )

    expect(baz.getError()).toStrictEqual({
      list: "baz",
      items: [
        null,
        {
          list: "foo",
          items: [null, "2"],
        },
      ],
    })
  })
})

describe("FormList#updateItems()", () => {
  it.concurrent("updates items' values", () => {
    const form = FormList.of([FormField.of("foo"), FormField.of("bar")])

    expect(form.getValue()).toStrictEqual(["foo", "bar"])

    form.items.at(0)?.setValue("foo1")
    expect(form.getValue()).toStrictEqual(["foo1", "bar"])

    form.items.at(1)?.setValue((y) => y + "2")
    expect(form.getValue()).toStrictEqual(["foo1", "bar2"])
  })

  it.concurrent("updates fields' errors", () => {
    const form = FormList.of(
      [FormField.of("foo", { error: 1 }), FormField.of("bar", { error: 2 })],
      { error: "err" },
    )

    expect(form.getError()).toStrictEqual({
      list: "err",
      items: [1, 2],
    })

    form.items.at(0)?.setError(3)
    expect(form.getError()).toStrictEqual({
      list: "err",
      items: [3, 2],
    })

    form.items.at(1)?.setError(null)
    expect(form.getError()).toStrictEqual({
      list: "err",
      items: [3, null],
    })

    form.items.at(0)?.setError(null)
    expect(form.getError()).toStrictEqual({
      list: "err",
      items: null,
    })
  })

  it.concurrent("modifies list", () => {
    const form = FormList.of(
      [FormField.of("foo", { error: 1 }), FormField.of("bar", { error: 2 })],
      { error: "err" },
    )

    form.setItems((x) => [...x, FormField.of("baz")])

    expect(form.getValue()).toStrictEqual(["foo", "bar", "baz"])
    expect(form.getError()).toStrictEqual({
      list: "err",
      items: [1, 2, null],
    })

    form.setItems((x) => [...x.slice(1), FormField.of("carabaz", { error: 3 })])
    expect(form.getValue()).toStrictEqual(["bar", "baz", "carabaz"])
    expect(form.getError()).toStrictEqual({
      list: "err",
      items: [2, null, 3],
    })
  })
})
