module.exports = {
    NODE_ENV: 'development', // test, development 
    PORT: 4000,
    LIVE_URL: 'https://avcall.demotestingsite.com',
    LOCAL_URL: 'http://localhost:3000',
    APP_NAME: 'AVC',

    // JWT
    JWT_TOKEN_EXPIRED_TIME: '24h', // In Hours
    JWT_TOKEN_SECRET: 'VIBRANT_PROJECT_MANAGEMENT_TOOL', // JWT Secret Key
    JWT_FORGOT_PASSWORD_TOKEN_EXPIRED_TIME: 2,

    // EMAIL CONFIGURATIONS
    MAIL_CREDS: {
        EMAIL_HOST: 'email-smtp.ap-south-1.amazonaws.com',
        EMAIL_USERNAME: 'AKIARK66T6AMVFSY2SFE',
        EMAIL_PASSWORD: 'BOgpUSSfP9XJk+1s4Bmbyz3XWzY1eJaY4or+TLTC2Zmo',
        EMAIL_PORT: 587,
        EMAIL_SERVICE: null,
        EMAIL_FROM: 'sarath@vibrant-info.com',
        EMAIL_FROM_NAME: 'CTRL VI TECH SERVICE LLP',
    }
}