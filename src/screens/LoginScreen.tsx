import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Button, Alert, ActivityIndicator, TextInput, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Yup from "yup";
import { isStoredGoogleSessionValid, loginWithGoogle } from "../services/oAuthService";
import { LoginRequest } from "../models/auth/LoginRequest";
import { login, logout } from "../services/authService";
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from "../utils/authStorage";
import { LogoutRequest } from "../models/auth/LogoutRequest";
import { clearClient, getClient, saveClient } from "../utils/clientStorage";
import { loginSchema } from "../utils/validationSchemas";
import { showToast } from "../shared/toastHelper";
import { fetchSeparationMetaData } from "../utils/separationStorage";

type LoginNavigationParamList = {
    Login: undefined;
    Initial: undefined;
    Registration: undefined;
};

export default function LoginScreen() {
    const navigation =
        useNavigation<NativeStackNavigationProp<LoginNavigationParamList>>();
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        let mounted = true;

        const runSilentCheck = async () => {
            try {
                const isValid = await isStoredGoogleSessionValid();

                if (!mounted) {
                    return;
                }

                if (isValid) {
                    await proceedToInitial();
                    return;
                }
            } finally {
                if (mounted) {
                    setIsCheckingSession(false);
                }
            }
        };

        void runSilentCheck();

        return () => {
            mounted = false;
        };
    }, [navigation]);

    const handleLogin = async () => {
        try {
            const token = await loginWithGoogle();

            if (token) {
                await proceedToInitial();
            } else {
                Alert.alert("Google Login", "Login failed or cancelled.");
            }
        } catch (error) {
            Alert.alert("Google Login Error", String(error));
        }
    };

    if (isCheckingSession) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" />
                <Text style={styles.subtitle}>Provjera prijave...</Text>
            </View>
        );
    }

    async function handleLocalLogin() {
        try {
            await loginSchema.validate({ username, password }, { abortEarly: false });
            setErrors({});
            setLoading(true);

            const request: LoginRequest = { username, password };
            const response = await login(request);

            await saveTokens(response.accessToken, response.refreshToken);
            await saveClient({
                id: response.id,
                name: response.name,
                surname: response.surname,
                username: response.username,
                email: response.email,
            });
            await proceedToInitial();
        } catch (err: any) {
            if (err instanceof Yup.ValidationError) {
                const newErrors: { [key: string]: string } = {};
                err.inner.forEach((e) => {
                    if (e.path) newErrors[e.path] = e.message;
                });
                setErrors(newErrors);
            } else {
                if (err.status === 401)
                    showToast("error", "Unsuccessful login", "Credentials are not valid.")
                    // Alert.alert("Greška", "Login nije uspio, 401");
                else Alert.alert("Greška", err.message || "Login nije uspio");
            }
        } finally {
            setLoading(false);
        }
    }

    async function proceedToInitial() {
        await fetchSeparationMetaData();
        navigation.replace("Initial");
    }


    async function handleLogout() {
        try {
            setLogoutLoading(true);
            const token = await getRefreshToken();
            const client = await getClient();
            if (token === null || client === null) return;
            const request: LogoutRequest = {
                clientId: client.id,
                refreshToken: token,
            };
            await logout(request);
            await clearTokens();
            await clearClient();
            Alert.alert("Logout uspješan", `Odjavio se`);
        } catch (error: any) {
            if (error.status === 401) Alert.alert("Greska", "Logout nije uspio, 401");
            else Alert.alert("Greška", error.message || "Login nije uspio");
        } finally {
            setLogoutLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>
            <View style={styles.inputContainer}>
                <TextInput
                    placeholder="Username"
                    value={username}
                    onChangeText={setUsername}
                    style={styles.input}
                />
                <View style={styles.errorContainer}>
                    <Text style={styles.error}>{errors.username || " "}</Text>
                </View>
            </View>

            <View style={styles.inputContainer}>
                <TextInput
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    style={styles.input}
                />
                <View style={styles.errorContainer}>
                    <Text style={styles.error}>{errors.password || " "}</Text>
                </View>
            </View>

            <Button title="Login" onPress={handleLocalLogin} />
            <Button title="Logout" onPress={handleLogout} />
            <Button
                title="Stari JWT"
                onPress={async () => {
                    console.log(await getAccessToken());
                    const refresh = (await getRefreshToken()) || "";
                    const jwt =
                        "eyJhbGciOiJIUzUxMiJ9.eyJqdGkiOiIyIiwic3ViIjoid2ljayIsImV4cCI6MTc3OTEzNzkzMn0.vj0zuSpKyep0i8z2MXxgXErcJlyylFgbAA3rKe3vy-r6jWrRAJzlYyGC1eInvFvPWc14gEGcQOIEzRSRRXaABg";
                    await clearTokens();
                    await saveTokens(jwt, refresh);
                    console.log(await getAccessToken());
                }}
            />
            {/* <Button title="Continue with Google" onPress={handleLogin} /> */}
            <Button
                title="Ispisi klijenta"
                onPress={async () => {
                    const client = await getClient();
                    console.log(client);
                    const access = await getAccessToken();
                    const refresh = await getRefreshToken();
                    console.log(access);
                    console.log(refresh);
                    // Alert.alert("Klijent", client ? `${client.name} ${client.surname}` : "Nema klijenta");
                }}
            />
            <TouchableOpacity onPress={() => navigation.navigate("Registration")}>
                <Text style={{ color: "#007AFF", marginTop: 12, textAlign: "center" }}>
                    Create new account
                </Text>
            </TouchableOpacity>
            {loading && (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Login...</Text>
                </View>
            )}
            {logoutLoading && (
                <View style={styles.overlay}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Logout...</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        padding: 20,
    },
    title: {
        fontSize: 24,
        marginBottom: 20,
        textAlign: "center",
    },
    subtitle: {
        marginTop: 12,
        textAlign: "center",
        color: "#666",
    },
    inputContainer: {
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        padding: 8,
        borderRadius: 5,
    },
    errorContainer: {
        minHeight: 20,
        justifyContent: "center",
    },
    error: {
        color: "red",
        fontSize: 14,
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
    },
});
