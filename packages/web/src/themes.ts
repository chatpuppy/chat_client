import BackgroundImage from '@chatpuppy/assets/images/background.jpg';
import BackgroundCoolImage from '@chatpuppy/assets/images/background-cool.jpg';

type Themes = {
    [theme: string]: {
        primaryColor: string;
        primaryTextColor: string;
        backgroundImage: string;
        aero: boolean;
    };
};

// ======
const themes: Themes = {
    default: {
        primaryColor: '32, 32, 32',
        primaryTextColor: '255, 255, 255',
        backgroundImage: BackgroundImage,
        aero: false,
    },
    cool: {
        primaryColor: '32,32,32',
        primaryTextColor: '255, 255, 255',
        backgroundImage: BackgroundCoolImage,
        aero: false,
    },
};

export default themes;
