import React, {useState} from 'react';
import { useSelector } from 'react-redux';

import ConnectWallet from './ConnectWallet';
import Dialog from '../../components/Dialog';
import { State } from '../../state/reducer';
import useAction from '../../hooks/useAction';

function LoginAndRegister() {
    const [loading, setLoading] = useState(false);
    const action = useAction();
    const loginRegisterDialogVisible = useSelector(
        (state: State) => state.status.loginRegisterDialogVisible,
    );

    
    return (
        <Dialog
            visible={loginRegisterDialogVisible}
            closable={!loading}
            onClose={() => action.toggleLoginRegisterDialog(false)}
            maskClosable={false}
        >
                <ConnectWallet loading={loading} setLoading={setLoading}/>
            
        </Dialog>
    );
}

export default LoginAndRegister;
