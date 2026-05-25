import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Client } from "../models/clients/Client";
import { saveClient } from "../utils/clientStorage";
import { registrationSchema } from "../utils/validationSchemas";
import * as Yup from "yup";
import { ClientRequest } from "../models/auth/ClientRequest";
import { registration } from "../services/authService";

type RegistrationNavigationParamList = {
  Login: undefined;
  Registration: undefined;
};

export default function RegistrationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RegistrationNavigationParamList>>();
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleRegister = async () => {
    try {
      await registrationSchema.validate(
        { name, surname, username, password, confirmPassword, email },
        { abortEarly: false }
      );
      setErrors({});
      setLoading(true);

      const request: ClientRequest = { name, surname, username, password, email };
      const response: Client = await registration(request);
      await saveClient(response);

      Alert.alert("Success", "Registration completed! We sent you verification e-mail, please verify");
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      })
    } catch (err: any) {
      if (err instanceof Yup.ValidationError) {
        const newErrors: { [key: string]: string } = {};
        err.inner.forEach((e) => {
          if (e.path) newErrors[e.path] = e.message;
        });
        setErrors(newErrors);
      } else {
        console.error("Registration error:", err);
        Alert.alert("Error", "Registration unsuccessful.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registracija klijenta</Text>

      <View style={styles.inputContainer}>
        <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
        {/* {errors.name && <Text style={styles.error}>{errors.name}</Text>} */}
        <View style={styles.errorContainer}>
          <Text style={styles.error}>{errors.name || " "}</Text>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <TextInput style={styles.input} placeholder="Surname" value={surname} onChangeText={setSurname} />
        {/* {errors.surname && <Text style={styles.error}>{errors.surname}</Text>} */}
        <View style={styles.errorContainer}>
          <Text style={styles.error}>{errors.surname || " "}</Text>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} />
        {/* {errors.username && <Text style={styles.error}>{errors.username}</Text>} */}
        <View style={styles.errorContainer}>
          <Text style={styles.error}>{errors.username || " "}</Text>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" value={email} onChangeText={setEmail} />
        {/* {errors.email && <Text style={styles.error}>{errors.email}</Text>} */}
        <View style={styles.errorContainer}>
          <Text style={styles.error}>{errors.email || " "}</Text>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
        {/* {errors.password && <Text style={styles.error}>{errors.password}</Text>} */}
        <View style={styles.errorContainer}>
          <Text style={styles.error}>{errors.password || " "}</Text>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <TextInput style={styles.input} placeholder="Confirm Password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
        {/* {errors.confirmPassword && <Text style={styles.error}>{errors.confirmPassword}</Text>} */}
        <View style={styles.errorContainer}>
          <Text style={styles.error}>{errors.confirmPassword || " "}</Text>
        </View>
      </View>

      <Button title="Registruj se" onPress={handleRegister} />

      {loading && (
        <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Registration...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 10,
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
    // marginBottom: 8 
    marginLeft: 10
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
    }
});
