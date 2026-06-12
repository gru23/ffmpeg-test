import { useEffect, useState } from "react";
import { showToast } from "../../shared/toastHelper";
import { deleteAllLocalSeparations, isLocalSeparationsStoringEnabled, setLocalSeparationStoring } from "../../utils/separationStorage"
import { StyleSheet, Switch, View, Text, Button } from "react-native";
import { switchColors } from "../../constants/switchColors";
import ConfirmDialog from "../../components/ConfirmDialog";

export default function SettingsScreen() {
    const [localStoring, setLocalStoring] = useState<boolean>(true);
    const [darkTheme, setDarkTheme] = useState<boolean>(false);

    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

    useEffect(() => {
        const loadLocalStoring = async () => {
            const isEnabledLocalStoring = await isLocalSeparationsStoringEnabled();
            setLocalStoring(isEnabledLocalStoring);
        };
        loadLocalStoring();
    }, []);

    const handleLocalStoringChange = async (value: boolean) => {
        setLocalStoring(value);
        await setLocalSeparationStoring(value);
    };

    const handleLightThemeChange = async (value: boolean) => {
        setDarkTheme(value);
        // loigka
    };

    const removeSeparations = async () => {
        // await deleteAllLocalSeparations();
        setShowDeleteModal(false);
        showToast('success', 'Successfully deleted', 'Local separations have been deleted.');
    }

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <Text style={styles.label}>Local separations storing</Text>
                <Switch 
                    value={localStoring}
                    onValueChange={handleLocalStoringChange}
                    trackColor={switchColors.trackColor}
                    thumbColor={localStoring ? switchColors.thumbColorOn : switchColors.thumbColorOff}    
                />
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>Dark theme</Text>
                <Switch
                    value={darkTheme}
                    onValueChange={handleLightThemeChange}
                    trackColor={switchColors.trackColor}
                    thumbColor={darkTheme ? switchColors.thumbColorOn : switchColors.thumbColorOff}    
                />
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>Delete all local separations</Text>
                <Button title="Delete" onPress={() => setShowDeleteModal(true)} />
            </View>

            <ConfirmDialog
                visible={showDeleteModal}
                title="Delete local separations"
                description="Do you want to delete separations from your application? You will stil be able to download stems from server."
                onConfirm={removeSeparations}
                onCancel={() => setShowDeleteModal(false)}
                confirmText="Delete"
                cancelText="Cancel"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginVertical: 12,
    },
    label: {
        fontSize: 16,
    },
});