import { Modal, View, Text, Button, StyleSheet } from "react-native";

type ConfirmDialogProps = {
    visible: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
};

export default function ConfirmDialog({
    visible, title, description, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel"
}: ConfirmDialogProps) {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.dialog}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.description}>{description}</Text>
                <View style={styles.buttons}>
                    <Button title={cancelText} onPress={onCancel} />
                    <Button title={confirmText} onPress={onConfirm} color="red" />
                </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    dialog: {
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 8,
        width: "80%",
    },
    title: { 
        fontSize: 18, 
        fontWeight: "bold", 
        marginBottom: 10 
    },
    description: { 
        marginBottom: 20 
    },
    buttons: { 
        flexDirection: "row", 
        justifyContent: "space-between" 
    },
});