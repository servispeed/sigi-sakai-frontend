/* eslint-disable @next/next/no-img-element */
'use client';
import { useRouter } from 'next/navigation';
import React, { useContext, useState, useRef } from 'react';
import { Button } from 'primereact/button';
import { Password } from 'primereact/password';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { classNames } from 'primereact/utils';
import { LayoutContext } from '../../../../layout/context/layoutcontext';
import { AuthService } from '@/app/service/authService';
import { UserService } from '@/app/service/userService';
import { LoginRequest } from '@/app/types/auth';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showChangePassDialog, setShowChangePassDialog] = useState(false);
    const [cpEmail, setCpEmail] = useState('');
    const [passwordActual, setPasswordActual] = useState('');
    const [nuevaPassword, setNuevaPassword] = useState('');
    const [confirmarPassword, setConfirmarPassword] = useState('');
    const [isChangingPass, setIsChangingPass] = useState(false);

    const { layoutConfig } = useContext(LayoutContext);
    const router = useRouter();
    const toast = useRef<Toast>(null);

    const containerClassName = classNames(
        'surface-ground flex align-items-center justify-content-center min-h-screen min-w-screen overflow-hidden',
        { 'p-input-filled': layoutConfig.inputStyle === 'filled' }
    );

    const OBTENER_RUTA_INICIAL = (permisos: string[] = []): string => {
        if (permisos.includes('VER_DASHBOARD')) return '/';
        if (permisos.includes('VER_PANEL_DISENO')) return '/designerlist';
        if (permisos.includes('VER_PANEL_TALLER')) return '/workshoplist';
        if (permisos.includes('GESTIONAR_COTIZACIONES')) return '/counter';
        if (permisos.includes('GESTIONAR_ORDENES')) return '/listorder';
        return '/pages/access';
    };

    const handleLogin = async () => {
        if (!email || !password) {
            toast.current?.show({ severity: 'warn', summary: 'Atención', detail: 'Ingresa correo y contraseña' });
            return;
        }

        setLoading(true);

        try {
            const credentials: LoginRequest = { email, password };
            const data = await AuthService.login(credentials);

            if (data.status === 401 || data.error) {
                throw new Error(data.message || 'Credenciales inválidas');
            }

            if (!data.token) {
                throw new Error('No se recibió respuesta válida del servidor.');
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify({
                idUsuario: data.idUsuario,
                email,
                rol: data.rol,
                permisos: data.permisos
            }));

            toast.current?.show({
                severity: 'success',
                summary: 'Bienvenido',
                detail: `Iniciando como ${data.rol}...`
            });

            const targetPath = OBTENER_RUTA_INICIAL(data.permisos);
            setTimeout(() => router.push(targetPath), 700);

        } catch (error: any) {
            console.error("Error en Login:", error);
            toast.current?.show({
                severity: 'error',
                summary: 'Error de Acceso',
                detail: error.message || 'No se pudo iniciar sesión.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    const openChangePasswordModal = () => {
        setCpEmail(email.trim());
        setPasswordActual('');
        setNuevaPassword('');
        setConfirmarPassword('');
        setShowChangePassDialog(true);
    };

    const handleChangePassword = async () => {
        if (!cpEmail.trim() || !passwordActual || !nuevaPassword || !confirmarPassword) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Campos requeridos',
                detail: 'Completa todos los campos para continuar.'
            });
            return;
        }

        if (nuevaPassword !== confirmarPassword) {
            toast.current?.show({
                severity: 'warn',
                summary: 'No coinciden',
                detail: 'La nueva contraseña y su confirmación deben ser iguales.'
            });
            return;
        }

        if (passwordActual === nuevaPassword) {
            toast.current?.show({
                severity: 'warn',
                summary: 'Contraseña sin cambios',
                detail: 'La nueva contraseña debe ser diferente a la actual.'
            });
            return;
        }

        setIsChangingPass(true);
        try {
            const authData = await AuthService.login({
                email: cpEmail.trim(),
                password: passwordActual
            });

            if (authData.status === 401 || authData.error || !authData.idUsuario) {
                throw new Error('El correo o la contraseña actual son incorrectos.');
            }

            const res = await UserService.cambiarPassword(
                authData.idUsuario,
                {
                    passwordActual,
                    nuevaPassword
                },
                authData.token
            );

            toast.current?.show({
                severity: 'success',
                summary: 'Contraseña Actualizada',
                detail: res.mensaje || 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.'
            });

            setEmail(cpEmail.trim());
            setPassword('');
            setShowChangePassDialog(false);
        } catch (error: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: error.message || 'No se pudo cambiar la contraseña.'
            });
        } finally {
            setIsChangingPass(false);
        }
    };

    return (
        <div className={containerClassName}>
            <Toast ref={toast} />

            <div className="flex flex-column align-items-center justify-content-center">
                <img src={`/layout/images/logo.png`} alt="Logo" className="mb-5 w-8rem flex-shrink-0" />

                <div
                    style={{
                        borderRadius: '56px',
                        padding: '0.3rem',
                        background: 'linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)'
                    }}
                >
                    <div className="w-full surface-card py-8 px-5 sm:px-8" style={{ borderRadius: '53px' }}>
                        <div className="text-center mb-5">
                            <div className="text-900 text-3xl font-medium mb-3">Bienvenido!</div>
                            <span className="text-600 font-medium">Inicia sesión para empezar a trabajar</span>
                        </div>

                        <div>
                            {/* CAMPO EMAIL */}
                            <label htmlFor="email" className="block text-900 text-xl font-medium mb-2">
                                Correo Electrónico
                            </label>
                            <InputText
                                id="email"
                                type="text"
                                placeholder="correo@ejemplo.com"
                                className="w-full md:w-30rem mb-5"
                                style={{ padding: '1rem' }}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />

                            {/* CAMPO PASSWORD */}
                            <label htmlFor="password" className="block text-900 font-medium text-xl mb-2">
                                Contraseña
                            </label>
                            <Password
                                inputId="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Contraseña"
                                toggleMask
                                feedback={false}
                                className="w-full mb-3"
                                inputClassName="w-full p-3 md:w-30rem"
                                onKeyDown={handleKeyDown}
                            />

                            {/* ACCIÓN: CAMBIAR CONTRASEÑA */}
                            <div className="flex align-items-center justify-content-end mb-5">
                                <button
                                    type="button"
                                    onClick={openChangePasswordModal}
                                    className="p-link font-medium text-primary hover:underline cursor-pointer"
                                >
                                    Cambiar contraseña
                                </button>
                            </div>

                            {/* BOTÓN LOGIN */}
                            <Button
                                label="Iniciar sesión"
                                className="w-full p-3 text-xl"
                                onClick={handleLogin}
                                loading={loading}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL DE CAMBIO DE CONTRASEÑA */}
            <Dialog
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-key text-primary text-xl" />
                        <span>Cambiar contraseña</span>
                    </div>
                }
                visible={showChangePassDialog}
                style={{ width: '90vw', maxWidth: '450px' }}
                modal
                onHide={() => setShowChangePassDialog(false)}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button
                            label="Cancelar"
                            icon="pi pi-times"
                            text
                            severity="secondary"
                            onClick={() => setShowChangePassDialog(false)}
                            disabled={isChangingPass}
                        />
                        <Button
                            label="Actualizar contraseña"
                            icon="pi pi-check"
                            onClick={handleChangePassword}
                            loading={isChangingPass}
                        />
                    </div>
                }
            >
                <div className="flex flex-column gap-3 pt-2">
                    <div className="field m-0">
                        <label htmlFor="cpEmail" className="font-bold block mb-2">Correo Electrónico</label>
                        <InputText
                            id="cpEmail"
                            type="email"
                            value={cpEmail}
                            onChange={(e) => setCpEmail(e.target.value)}
                            placeholder="correo@ejemplo.com"
                            className="w-full"
                        />
                    </div>

                    <div className="field m-0">
                        <label htmlFor="passwordActual" className="font-bold block mb-2">Contraseña actual</label>
                        <Password
                            inputId="passwordActual"
                            value={passwordActual}
                            onChange={(e) => setPasswordActual(e.target.value)}
                            placeholder="Ingresa tu contraseña actual"
                            toggleMask
                            feedback={false}
                            className="w-full"
                            inputClassName="w-full"
                        />
                    </div>

                    <div className="field m-0">
                        <label htmlFor="nuevaPassword" className="font-bold block mb-2">Nueva contraseña</label>
                        <Password
                            inputId="nuevaPassword"
                            value={nuevaPassword}
                            onChange={(e) => setNuevaPassword(e.target.value)}
                            placeholder="Ingresa la nueva contraseña"
                            toggleMask
                            className="w-full"
                            inputClassName="w-full"
                        />
                    </div>

                    <div className="field m-0">
                        <label htmlFor="confirmarPassword" className="font-bold block mb-2">Confirmar nueva contraseña</label>
                        <Password
                            inputId="confirmarPassword"
                            value={confirmarPassword}
                            onChange={(e) => setConfirmarPassword(e.target.value)}
                            placeholder="Repite la nueva contraseña"
                            toggleMask
                            className="w-full"
                            inputClassName="w-full"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleChangePassword();
                            }}
                        />
                    </div>
                </div>
            </Dialog>
        </div>
    );
};

export default LoginPage;