import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendOTP = async (email: string, otp: string) => {
  if (!process.env.SMTP_USER || process.env.SMTP_USER.includes("example.com")) {
    console.log(`[SIMULATED EMAIL] MyZapp Registration OTP for ${email}: ${otp}`);
    return true;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "MyZapp <noreply@myzapp.com>",
      to: email,
      subject: "MyZapp - Code de validation de votre compte",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; color: #f8fafc; max-width: 500px; margin: auto; background: #060D1F; border: 1px solid rgba(0, 208, 108, 0.2); padding: 30px; border-radius: 24px;">
          <div style="margin-bottom: 20px;">
            <h1 style="color: #00D06C; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">My<span style="color: #FFFFFF;">Zapp</span></h1>
            <p style="color: #94a3b8; font-size: 11px; margin-top: 4px; text-transform: uppercase; letter-spacing: 2px;">BOOSTEZ WHATSAPP, DÉPASSEZ LES LIMITES</p>
          </div>
          
          <h2 style="color: #FFFFFF; font-size: 18px; font-weight: 700; margin-bottom: 8px;">Validez votre adresse email</h2>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.5;">Voici votre code de sécurité à usage unique pour activer votre espace utilisateur MyZapp :</p>
          
          <div style="background: rgba(0, 208, 108, 0.1); border: 1px solid rgba(0, 208, 108, 0.3); border-radius: 16px; padding: 18px; margin: 24px 0;">
            <span style="font-size: 38px; font-weight: 800; color: #00FFA2; letter-spacing: 8px; font-family: monospace;">
              ${otp}
            </span>
          </div>
          
          <p style="color: #64748b; font-size: 12px; margin-bottom: 20px;">⏳ Ce code expire dans 15 minutes.</p>
          <hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 24px 0;" />
          <p style="color: #64748b; font-size: 11px; line-height: 1.4;">
            💡 <strong>Rappel</strong> : Si vous ne voyez pas nos emails, pensez à vérifier votre dossier <strong>Spams / Courriers indésirables</strong>.<br>
            Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.
          </p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Error sending MyZapp registration OTP:", error);
    return false;
  }
};

export const sendPasswordResetOTP = async (email: string, otp: string) => {
  if (!process.env.SMTP_USER || process.env.SMTP_USER.includes("example.com")) {
    console.log(`[SIMULATED EMAIL] MyZapp Password Reset OTP for ${email}: ${otp}`);
    return true;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "MyZapp <noreply@myzapp.com>",
      to: email,
      subject: "MyZapp - Récupération de votre mot de passe",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; color: #f8fafc; max-width: 500px; margin: auto; background: #060D1F; border: 1px solid rgba(59, 130, 246, 0.3); padding: 30px; border-radius: 24px;">
          <div style="margin-bottom: 20px;">
            <h1 style="color: #00D06C; margin: 0; font-size: 26px; font-weight: 800;">My<span style="color: #FFFFFF;">Zapp</span></h1>
          </div>
          
          <h2 style="color: #38bdf8; font-size: 18px; font-weight: 700; margin-bottom: 8px;">Récupération de mot de passe</h2>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.5;">Utilisez le code suivant pour réinitialiser le mot de passe de votre compte :</p>
          
          <div style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 16px; padding: 18px; margin: 24px 0;">
            <span style="font-size: 38px; font-weight: 800; color: #38bdf8; letter-spacing: 8px; font-family: monospace;">
              ${otp}
            </span>
          </div>
          
          <p style="color: #64748b; font-size: 12px; margin-bottom: 20px;">⏳ Ce code est valable pendant 15 minutes.</p>
          <hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 24px 0;" />
          <p style="color: #64748b; font-size: 11px;">
            Pensez à vérifier vos courriers indésirables (spams) si vous ne recevez pas le message dans votre boîte de réception.
          </p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Error sending MyZapp password reset OTP:", error);
    return false;
  }
};
