import { Text } from 'native-base';
import React from 'react';
import { Linking, StyleSheet, TouchableOpacity } from 'react-native';
import Dialog from 'react-native-dialog';
import { removeStorageValue, setStorageValue } from '../../utils/storage';

export const PrivacyPolicyStorageKey = 'privacy-policy';

type Props = {
    visible: boolean;
    onClose: () => void;
};

function PrivacyPolicy({ visible, onClose }: Props) {
    function handleClickPrivacyPolicy() {
        Linking.openURL('https://app.chatpuppy.com/PrivacyPolicy.html');
    }

    async function handleAgree() {
        await setStorageValue(PrivacyPolicyStorageKey, 'true');
        onClose();
    }

    async function handleDisagree() {
        await removeStorageValue(PrivacyPolicyStorageKey);
        onClose();
    }

    return (
        <Dialog.Container visible={visible}>
            <Dialog.Title>Terms and Conditions</Dialog.Title>
            <Dialog.Description style={styles.container}>
                Welcome to use ChatPuppy
                <TouchableOpacity onPress={handleClickPrivacyPolicy}>
                    <Text style={styles.text}>Privacy Policy</Text>
                </TouchableOpacity>

            </Dialog.Description>
            <Dialog.Button label="不同意" onPress={handleDisagree} />
            <Dialog.Button label="同意" onPress={handleAgree} />
        </Dialog.Container>
    );
}

export default PrivacyPolicy;

const styles = StyleSheet.create({
    container: {
        textAlign: 'left',
    },
    text: {
        fontSize: 12,
        color: '#2a7bf6',
    },
});
