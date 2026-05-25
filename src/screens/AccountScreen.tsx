import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, ScrollView, Keyboard, TouchableOpacity, ActivityIndicator } from "react-native";
import { getClient, getClientId, saveClient } from "../utils/clientStorage";
import { clientUpdateSchema, passwordChangeSchema } from "../utils/validationSchemas";
import * as Yup from "yup";
import { changePassword, update } from "../services/clientService";
import { Client } from "../models/clients/Client";

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
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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
      await clientUpdateSchema.validate({ name, surname, username, email }, { abortEarly: false });
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
      await passwordChangeSchema.validate({ oldPassword, newPassword, confirmPassword }, { abortEarly: false });
      setErrors({});
      const response = await changePassword({oldPassword: oldPassword, newPassword: newPassword});
      console.log(response);
      console.log("Lozinka validna, šaljem na backend");
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

  return (
    <View style={styles.outlineContainer}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Update account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Update account</Text>

          <View style={styles.inputContainer}>
            <TextInput style={styles.input} placeholder="Name*" value={name} onChangeText={setName} />
            <View style={styles.errorContainer}>
              <Text style={styles.error}>{errors.name || " "}</Text>
            </View>
          </View>
          {/* <TextInput style={styles.input} placeholder="Name*" value={name} onChangeText={setName} />
          {errors.name && <Text style={styles.error}>{errors.name}</Text>} */}

          <View style={styles.inputContainer}>
            <TextInput style={styles.input} placeholder="Surname*" value={surname} onChangeText={setSurname} />
            <View style={styles.errorContainer}>
              <Text style={styles.error}>{errors.surname || " "}</Text>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <TextInput style={styles.input} placeholder="Username*" value={username} onChangeText={setUsername} />
            <View style={styles.errorContainer}>
              <Text style={styles.error}>{errors.username || " "}</Text>
            </View>
          </View>
          <View style={styles.inputContainer}>
            <TextInput style={styles.input} placeholder="Email*" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <View style={styles.errorContainer}>
              <Text style={styles.error}>{errors.email || " "}</Text>
            </View>
          </View>

          <Button title="Update account" onPress={handleUpdateAccount} disabled={!isChanged} />
          {/* <TouchableOpacity style={styles.button} onPress={handleUpdateAccount}>
              <Text style={styles.buttonText}>Update account</Text>
          </TouchableOpacity> */}
        </View>

        {/* Password reset */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change password</Text>

          <View style={styles.inputContainer}>
            <TextInput style={styles.input} placeholder="Old Password" secureTextEntry value={oldPassword} onChangeText={setOldPassword} />
            <View style={styles.errorContainer}>
              <Text style={styles.error}>{errors.oldPassword || " "}</Text>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <TextInput style={styles.input} placeholder="New Password" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
            <View style={styles.errorContainer}>
              <Text style={styles.error}>{errors.newPassword || " "}</Text>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <TextInput style={styles.input} placeholder="Confirm new Password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
            <View style={styles.errorContainer}>
              <Text style={styles.error}>{errors.confirmPassword || " "}</Text>
            </View>
          </View>

          <Button title="Change password" onPress={handleChangePassword} />
        </View>
      </ScrollView>
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Updating...</Text>
        </View>
      )}
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
