import { View, Text } from 'native-base';
import React from 'react';
import { StyleSheet } from 'react-native';
import Dialog from 'react-native-dialog';

type Props = {
    visible: boolean;
    onClose: () => void;
    onOK: () => void;
};

function Sponsor({ visible, onClose, onOK }: Props) {
    return (
        <Dialog.Container visible={visible}>
            <Dialog.Title>Grand</Dialog.Title>
            <Dialog.Description>
                <View>
                    <Text style={styles.text}>
                        Please grand
                    </Text>
                    <Text style={styles.tip}>
                        Input your account id
                    </Text>
                </View>
            </Dialog.Description>
            <Dialog.Button label="Close" onPress={onClose} />
            <Dialog.Button label="Grand" onPress={onOK} />
        </Dialog.Container>
    );
}

export default Sponsor;

const styles = StyleSheet.create({
    text: {
        fontSize: 14,
        color: '#333',
        marginTop: 16,
    },
    tip: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        marginTop: 12,
    },
});
