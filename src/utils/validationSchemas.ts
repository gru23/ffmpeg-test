import * as Yup from "yup";
import { update, usernameAvailable } from "../services/clientService";
import { getClientId } from "./clientStorage";

export const loginSchema = Yup.object().shape({
  username: Yup.string()
    .required("Username is required"),
    // .min(3, "Username must be at least 3 characters"),
  password: Yup.string()
    .required("Password is required")
    // .min(6, "Password must be at least 6 characters"),
});

export const clientUpdateSchema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
  surname: Yup.string().required("Surname is required"),
  username: Yup.string()
    .required("Username is required")
    .test("unique-username", "Username is required", async function (value) {
      if (!value) return false;

      try {
        const clientId = await getClientId();
        if (clientId === null) return false;

        await update(clientId, {
          name: this.parent.name,
          surname: this.parent.surname,
          username: value,
          email: this.parent.email,
        });

        return true;
      } catch (error: any) {
        return false;
      }
    }),
  email: Yup.string().email("Email is not valid").required("Email is required"),
});

export const passwordChangeSchema = Yup.object().shape({
  oldPassword: Yup.string().required("Old password is required"),
  newPassword: Yup.string().min(6, "Password must be at least 6 characters").required("New password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("newPassword")], "Passwords aren't matching")
    .required("Confirm password"),
});

export const registrationSchema = Yup.object().shape({
    name: Yup.string().required("Name is required"),
    surname: Yup.string().required("Surname is required"),
    username: Yup.string()
    .required("Username is required")
    .test("unique-username", "Username is already used", async function (value) {
      if (!value) return false;

      try {
        const available = await usernameAvailable(value);
        return available;
      } catch (error: any) {
        return false;
      }
    }),
    password: Yup.string().required("Password is required"),
    confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Confirm password is required"),
    email: Yup.string().email("Invalid e-mail").required("E-mail address is required")
});