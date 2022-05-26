import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"

import {
  Validate,
  FormValue,
  useFormValue,
  useGetFormError,
  useSweetyForm,
  FormShape,
} from "../src"

const Input: React.FC<{
  state: FormValue<string, string>
  validate: Validate<string, string>
}> = ({ state, validate, ...props }) => {
  const [value, setValue] = useFormValue(state, { validate })
  const error = useGetFormError(state)

  return (
    <>
      <input
        {...props}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />

      <div>{error}</div>
    </>
  )
}

describe("LoginForm", () => {
  const validateEmail = vi.fn((email: string) => {
    if (email.includes("@")) {
      return null
    }

    return "Invalid email"
  })

  const validatePassword = vi.fn((password: string) => {
    if (password.length > 5) {
      return null
    }

    return "Invalid password"
  })

  abstract class LoginFormShape extends FormShape<{
    email: FormValue<string, string>

    password: FormValue<string, string>
  }> {
    public static init({
      email,
      password,
    }: {
      email: string
      password: string
    }): LoginFormShape {
      return FormShape.of({
        email: FormValue.of(email),
        password: FormValue.of(password),
      })
    }
  }

  const LoginForm: React.FC<{
    form: LoginFormShape
    validateEmail?: Validate<string, string>
    validatePassword?: Validate<string, string>
    onSubmit?: VoidFunction
  }> = ({
    form: initialForm,
    validateEmail: validateEmailProp = validateEmail,
    validatePassword: validatePasswordProp = validatePassword,
    onSubmit = vi.fn(),
  }) => {
    const { form, submit } = useSweetyForm(() => initialForm, { onSubmit })

    return (
      <form onSubmit={submit}>
        <Input
          data-testid="email"
          state={form.fields.email}
          validate={validateEmailProp}
        />
        <Input
          data-testid="password"
          state={form.fields.password}
          validate={validatePasswordProp}
        />
        <button type="submit" />
      </form>
    )
  }

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("should validate initial values with errors", () => {
    const form = LoginFormShape.init({
      email: "",
      password: "",
    })

    render(<LoginForm form={form} />)

    expect(screen.getByTestId("email")).toHaveValue("")
    expect(screen.getByTestId("password")).toHaveValue("")
    expect(form.fields.email.getError()).toBe("Invalid email")
    expect(screen.getByText("Invalid email")).toBeInTheDocument()
    expect(form.fields.password.getError()).toBe("Invalid password")
    expect(screen.getByText("Invalid password")).toBeInTheDocument()
  })

  it("should validate updates with errors", () => {
    const form = LoginFormShape.init({
      email: "",
      password: "",
    })

    render(<LoginForm form={form} />)

    const emailInput = screen.getByTestId("email")
    const passwordInput = screen.getByTestId("password")

    fireEvent.change(emailInput, { target: { value: "foo" } })
    expect(emailInput).toHaveValue("foo")
    expect(validateEmail).toHaveBeenLastCalledWith("foo", "Invalid email")
    expect(screen.getByText("Invalid email")).toBeInTheDocument()

    fireEvent.change(passwordInput, { target: { value: "qw" } })
    expect(passwordInput).toHaveValue("qw")
    expect(validatePassword).toHaveBeenLastCalledWith("qw", "Invalid password")
    expect(screen.getByText("Invalid password")).toBeInTheDocument()
  })

  it("should validate updates without errors", () => {
    const form = LoginFormShape.init({
      email: "",
      password: "",
    })

    render(<LoginForm form={form} />)

    const emailInput = screen.getByTestId("email")
    const passwordInput = screen.getByTestId("password")

    fireEvent.change(emailInput, { target: { value: "foo@gmail.com" } })
    expect(emailInput).toHaveValue("foo@gmail.com")
    expect(validateEmail).toHaveBeenLastCalledWith(
      "foo@gmail.com",
      "Invalid email",
    )
    expect(screen.queryByText("Invalid email")).not.toBeInTheDocument()

    fireEvent.change(passwordInput, { target: { value: "qwerty" } })
    expect(passwordInput).toHaveValue("qwerty")
    expect(validatePassword).toHaveBeenLastCalledWith(
      "qwerty",
      "Invalid password",
    )
    expect(screen.queryByText("Invalid password")).not.toBeInTheDocument()
  })

  it("should validate initial values without errors", () => {
    const form = LoginFormShape.init({
      email: "foo@gmail.com",
      password: "qwerty",
    })

    render(<LoginForm form={form} />)

    expect(screen.getByTestId("email")).toHaveValue("foo@gmail.com")
    expect(screen.getByTestId("password")).toHaveValue("qwerty")
    expect(screen.queryByText("Invalid email")).not.toBeInTheDocument()
    expect(screen.queryByText("Invalid password")).not.toBeInTheDocument()
  })

  it("should re-validate initial values with errors", () => {
    const form = LoginFormShape.init({
      email: "foo@gmail.com",
      password: "qwerty",
    })

    render(<LoginForm form={form} />)

    const emailInput = screen.getByTestId("email")
    const passwordInput = screen.getByTestId("password")

    fireEvent.change(emailInput, { target: { value: "foo" } })
    expect(emailInput).toHaveValue("foo")
    expect(validateEmail).toHaveBeenLastCalledWith("foo", null)
    expect(screen.getByText("Invalid email")).toBeInTheDocument()

    fireEvent.change(passwordInput, { target: { value: "qw" } })
    expect(passwordInput).toHaveValue("qw")
    expect(validatePassword).toHaveBeenLastCalledWith("qw", null)
    expect(screen.getByText("Invalid password")).toBeInTheDocument()
  })

  it("should call onSubmit when submits", () => {
    const form = LoginFormShape.init({
      email: "foo",
      password: "qwe",
    })

    const onSubmit = vi.fn()

    render(<LoginForm form={form} onSubmit={onSubmit} />)

    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button"))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenLastCalledWith(
      {
        email: "foo",
        password: "qwe",
      },
      {
        shape: null,
        fields: {
          email: "Invalid email",
          password: "Invalid password",
        },
      },
      form,
      expect.anything(),
    )
  })

  it("should re-validate when validate function changes", () => {
    const form = LoginFormShape.init({
      email: "foo",
      password: "qwe",
    })
    const validateShortEmail = vi.fn((email: string) => {
      return email.length > 3 ? null : "Too short email"
    })

    const { rerender } = render(<LoginForm form={form} />)

    expect(screen.getByText("Invalid email")).toBeInTheDocument()

    rerender(<LoginForm form={form} validateEmail={validateShortEmail} />)

    expect(screen.queryByText("Invalid email")).not.toBeInTheDocument()
    expect(screen.getByText("Too short email")).toBeInTheDocument()
    expect(validateShortEmail).toHaveBeenCalledTimes(1)
    expect(validateShortEmail).toHaveBeenLastCalledWith("foo", "Invalid email")
  })
})
