import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Keyboard, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { clearClient, getClient, getClientId, saveClient } from "../utils/clientStorage";
import { clientUpdateSchema, passwordChangeSchema } from "../utils/validationSchemas";
import * as Yup from "yup";
import { changePassword, deleteClient, update } from "../services/clientService";
import { Client } from "../models/clients/Client";
import { clearTokens } from "../utils/authStorage";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp  } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import ConfirmDialog from "../components/ConfirmDialog";
import InputField from "../components/InputField";
import { showToast } from "../shared/ToastHelper";


type NavigationProp = NativeStackNavigationProp <RootStackParamList, "Account">;

export default function ProfileScreen() {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [originalClient, setOriginalClient] = useState<Client | null>(null);

  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    const loadClient = async () => {
      const client = await getClient();
      if (client) {
        setName(client.name);
        setSurname(client.surname);
        setUsername(client.username);
        setEmail(client.email);
        setOriginalClient(client);
      }
    };
    void loadClient();
  }, []);

  const isChanged =
    originalClient &&
    (name !== originalClient.name ||
    surname !== originalClient.surname ||
    username !== originalClient.username ||
    email !== originalClient.email);

  const handleUpdateAccount = async () => {
    try {
      setLoading(true);
      Keyboard.dismiss();
      await clientUpdateSchema.validate(
        { name, surname, username, email }, 
        { abortEarly: false, context: {originalClient} }
      );
      setErrors({});
      const clientId = await getClientId();
      if(clientId === null)
        return;
      const updatedClient: Client = await update(
        clientId, 
        { 
            name: name, 
            surname: surname, 
            username: username, 
            email: email
        }
      );
      console.log(updatedClient);
      await saveClient(updatedClient);
      setOriginalClient(updatedClient);
      showToast("success", "Account updated", "Your changes have been saved.");
      console.log("Podaci validni, šaljem na backend");
    } catch (err) {
      if (err instanceof Yup.ValidationError) {
        const newErrors: { [key: string]: string } = {};
        err.inner.forEach(e => {
          if (e.path) newErrors[e.path] = e.message;
        });
        setErrors(newErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      setLoading(true);
      await passwordChangeSchema.validate(
        { oldPassword, newPassword, confirmPassword }, 
        { abortEarly: false }
      );
      setErrors({});
      const response = await changePassword({oldPassword: oldPassword, newPassword: newPassword});
      console.log(response);
      console.log("Lozinka validna, šaljem na backend");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("success", "Password changed", "Your password have been changed.");
    } catch (err: any) {
      if (err instanceof Yup.ValidationError) {
        const newErrors: { [key: string]: string } = {};
        err.inner.forEach(e => {
          if (e.path) newErrors[e.path] = e.message;
        });
        setErrors(newErrors);
      } else {
        if (err.status === 401) {
          setErrors({ oldPassword: "Old password is incorrect" });
        } else {
          setErrors({ oldPassword: err.message || "Password change failed" });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      const clientId = await getClientId();
      if (!clientId) return;
      await deleteClient(clientId);
      await clearClient();
      await clearTokens();
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } catch (err) {
      Alert.alert("Error", "Account deletion failed. Please try again.");
    } finally {
      setShowDialog(false);
    }
  };

  return (
    <View style={styles.outlineContainer}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Update account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Update account</Text>

          <InputField 
            placeholder="Name*"
            value={name}
            onChangeText={setName}
            error={errors.name}
          />

          <InputField 
            placeholder="Surname*"
            value={surname}
            onChangeText={setSurname}
            error={errors.surname}
          />

          <InputField 
            placeholder="Username*"
            value={username}
            onChangeText={setUsername}
            error={errors.username}
          />

          <InputField 
            placeholder="E-mail"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
          />

          <Button title="Update account" onPress={handleUpdateAccount} disabled={!isChanged} />
          {/* <TouchableOpacity style={styles.button} onPress={handleUpdateAccount}>
              <Text style={styles.buttonText}>Update account</Text>
          </TouchableOpacity> */}
        </View>

        {/* Password reset */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change password</Text>

          <InputField 
            placeholder="Old Password"
            secureTextEntry
            value={oldPassword}
            onChangeText={setOldPassword}
            error={errors.oldPassword}
          />
         
          <InputField 
            placeholder="New Password"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            error={errors.newPassword}
          />

          <InputField 
            placeholder="Confirm new Password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={errors.confirmPassword}
          />

          <Button title="Change password" onPress={handleChangePassword} />
        </View>
        <View>
          <Button title="Delete Account" color="red" onPress={() => setShowDialog(true)} />
        </View>
      </ScrollView>
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Updating...</Text>
        </View>
      )}

      <ConfirmDialog 
        visible={showDialog}
        title="Confirm Delete"
        description="Are you sure you want to delete your account? This action cannot be undone."
        onCancel={() => setShowDialog(false)}
        onConfirm={handleConfirmDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outlineContainer: {
    flex: 1,
  },
  container: { 
    flex: 1, 
    padding: 16 
  },
  section: {
    marginBottom: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: "bold", 
    marginBottom: 12 
  },
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 5,
  },
  errorContainer: {
    minHeight: 20,
    justifyContent: "center",
  },
  error: { 
    color: "red",
    marginLeft: 10
  },

  button: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(189, 200, 206, 0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
});
