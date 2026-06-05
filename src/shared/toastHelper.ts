import Toast from "react-native-toast-message";

export const showToast = (
    type: 'success' | 'error' | 'info', 
    text1: string, 
    text2?: string
) => {
  Toast.show({
    visibilityTime: 4000,   // does not work
    type,
    text1,
    text2,
    position: 'bottom',
  });
};