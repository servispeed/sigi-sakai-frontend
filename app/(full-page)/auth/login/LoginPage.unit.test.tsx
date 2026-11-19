import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoginPage from '@/app/(full-page)/auth/login/page';
import { AuthService } from '@/app/service/authService';
import { UserService } from '@/app/service/userService';
import { LayoutContext } from '../../../../layout/context/layoutcontext';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));

jest.mock('@/app/service/authService', () => ({
    AuthService: {
        login: jest.fn(),
    },
}));

jest.mock('@/app/service/userService', () => ({
    UserService: {
        cambiarPassword: jest.fn(),
    },
}));

const mockToastShow = jest.fn();
jest.mock('primereact/toast', () => ({
    Toast: React.forwardRef((_props, ref: any) => {
        React.useImperativeHandle(ref, () => ({
            show: mockToastShow,
        }));
        return <div data-testid="primereact-toast" />;
    }),
}));

describe('LoginPage Component', () => {
    const mockLayoutConfig = {
        inputStyle: 'outlined',
    };

    const renderComponent = (customLayoutConfig = mockLayoutConfig) => {
        return render(
            <LayoutContext.Provider value={{ layoutConfig: customLayoutConfig } as any}>
                <LoginPage />
            </LayoutContext.Provider>
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    it('debe renderizar el formulario con todos sus elementos iniciales', () => {
        renderComponent();

        expect(screen.getByAltText('Logo')).toBeInTheDocument();
        expect(screen.getByText('Bienvenido!')).toBeInTheDocument();
        expect(screen.getByLabelText(/Correo Electrónico/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Cambiar contraseña/i })).toBeInTheDocument();
    });

    it('debe aplicar la clase p-input-filled cuando inputStyle es filled', () => {
        const { container } = renderComponent({ inputStyle: 'filled' });

        expect(container.firstChild).toHaveClass('p-input-filled');
    });

    it('debe mostrar advertencia si se intenta iniciar sesión con campos vacíos', () => {
        renderComponent();

        fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

        expect(mockToastShow).toHaveBeenCalledWith({
            severity: 'warn',
            summary: 'Atención',
            detail: 'Ingresa correo y contraseña',
        });
        expect(AuthService.login).not.toHaveBeenCalled();
    });

    it('debe manejar correctamente el flujo de login exitoso y guardar datos en localStorage', async () => {
        const mockAuthResponse = {
            token: 'fake-jwt-token',
            idUsuario: 123,
            rol: 'ADMIN',
            permisos: ['VER_DASHBOARD'],
        };

        (AuthService.login as jest.Mock).mockResolvedValueOnce(mockAuthResponse);

        renderComponent();

        fireEvent.change(screen.getByPlaceholderText('correo@ejemplo.com'), {
            target: { value: 'usuario@test.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('Contraseña'), {
            target: { value: 'password123' },
        });
        fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

        await waitFor(() => {
            expect(AuthService.login).toHaveBeenCalledWith({
                email: 'usuario@test.com',
                password: 'password123',
            });
        });

        expect(localStorage.getItem('token')).toBe('fake-jwt-token');
        expect(JSON.parse(localStorage.getItem('user')!)).toEqual({
            idUsuario: 123,
            email: 'usuario@test.com',
            rol: 'ADMIN',
            permisos: ['VER_DASHBOARD'],
        });

        expect(mockToastShow).toHaveBeenCalledWith({
            severity: 'success',
            summary: 'Bienvenido',
            detail: 'Iniciando como ADMIN...',
        });

        jest.advanceTimersByTime(700);
        expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('debe ejecutar el login al presionar Enter y no hacer nada con otras teclas', async () => {
        (AuthService.login as jest.Mock).mockResolvedValueOnce({
            token: 'fake-token',
            idUsuario: 1,
            rol: 'DISENADOR',
            permisos: ['VER_PANEL_DISENO'],
        });

        renderComponent();

        const emailInput = screen.getByPlaceholderText('correo@ejemplo.com');
        const passwordInput = screen.getByPlaceholderText('Contraseña');

        fireEvent.change(emailInput, { target: { value: 'diseno@test.com' } });
        fireEvent.change(passwordInput, { target: { value: '123456' } });

        fireEvent.keyDown(passwordInput, { key: 'Tab', code: 'Tab' });
        expect(AuthService.login).not.toHaveBeenCalled();

        fireEvent.keyDown(passwordInput, { key: 'Enter', code: 'Enter' });

        await waitFor(() => {
            expect(AuthService.login).toHaveBeenCalled();
        });

        jest.advanceTimersByTime(700);
        expect(mockPush).toHaveBeenCalledWith('/designerlist');
    });

    describe('Evaluación de Ruteo Inicial según Permisos', () => {
        const testCases = [
            { permisos: ['VER_DASHBOARD'], expectedPath: '/' },
            { permisos: ['VER_PANEL_DISENO'], expectedPath: '/designerlist' },
            { permisos: ['VER_PANEL_TALLER'], expectedPath: '/workshoplist' },
            { permisos: ['GESTIONAR_COTIZACIONES'], expectedPath: '/counter' },
            { permisos: ['GESTIONAR_ORDENES'], expectedPath: '/listorder' },
            { permisos: ['OTRO_PERMISO_DESCONOCIDO'], expectedPath: '/pages/access' },
            { permisos: [], expectedPath: '/pages/access' },
            { permisos: undefined, expectedPath: '/pages/access' },
        ];

        testCases.forEach(({ permisos, expectedPath }) => {
            test(`debe redirigir a ${expectedPath} cuando permisos son ${JSON.stringify(permisos)}`, async () => {
                (AuthService.login as jest.Mock).mockResolvedValueOnce({
                    token: 'tok',
                    idUsuario: 1,
                    rol: 'USER',
                    permisos,
                });

                renderComponent();

                fireEvent.change(screen.getByPlaceholderText('correo@ejemplo.com'), { target: { value: 'a@a.com' } });
                fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: '123' } });
                fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

                await waitFor(() => expect(AuthService.login).toHaveBeenCalled());

                jest.advanceTimersByTime(700);
                expect(mockPush).toHaveBeenCalledWith(expectedPath);
            });
        });
    });

    it('debe manejar errores de respuesta del servidor (401, flag error y respuesta sin token)', async () => {
        const spyConsole = jest.spyOn(console, 'error').mockImplementation(() => { });

        (AuthService.login as jest.Mock).mockResolvedValueOnce({
            status: 401,
            message: 'Credenciales incorrectas',
        });

        renderComponent();

        fireEvent.change(screen.getByPlaceholderText('correo@ejemplo.com'), { target: { value: 'err@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: 'wrong' } });
        fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

        await waitFor(() => {
            expect(mockToastShow).toHaveBeenCalledWith({
                severity: 'error',
                summary: 'Error de Acceso',
                detail: 'Credenciales incorrectas',
            });
        });

        (AuthService.login as jest.Mock).mockResolvedValueOnce({
            error: true,
        });

        fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

        await waitFor(() => {
            expect(mockToastShow).toHaveBeenCalledWith({
                severity: 'error',
                summary: 'Error de Acceso',
                detail: 'Credenciales inválidas',
            });
        });

        (AuthService.login as jest.Mock).mockResolvedValueOnce({
            idUsuario: 1,
        });

        fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

        await waitFor(() => {
            expect(mockToastShow).toHaveBeenCalledWith({
                severity: 'error',
                summary: 'Error de Acceso',
                detail: 'No se recibió respuesta válida del servidor.',
            });
        });

        expect(mockPush).not.toHaveBeenCalled();
        spyConsole.mockRestore();
    });

    it('debe manejar excepciones/fallos de red durante el proceso de login (con y sin mensaje)', async () => {
        const spyConsole = jest.spyOn(console, 'error').mockImplementation(() => { });

        (AuthService.login as jest.Mock).mockRejectedValueOnce(new Error('Fallo de conexión'));

        renderComponent();

        fireEvent.change(screen.getByPlaceholderText('correo@ejemplo.com'), { target: { value: 'err@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: '123' } });
        fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

        await waitFor(() => {
            expect(mockToastShow).toHaveBeenCalledWith({
                severity: 'error',
                summary: 'Error de Acceso',
                detail: 'Fallo de conexión',
            });
        });

        (AuthService.login as jest.Mock).mockRejectedValueOnce({});
        fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

        await waitFor(() => {
            expect(mockToastShow).toHaveBeenCalledWith({
                severity: 'error',
                summary: 'Error de Acceso',
                detail: 'No se pudo iniciar sesión.',
            });
        });

        spyConsole.mockRestore();
    });

    describe('Modal de Cambio de Contraseña', () => {
        const openModalWithEmail = (initialEmail = '  usuario@test.com  ') => {
            renderComponent();

            if (initialEmail) {
                fireEvent.change(screen.getByPlaceholderText('correo@ejemplo.com'), {
                    target: { value: initialEmail },
                });
            }

            fireEvent.click(screen.getByRole('button', { name: /Cambiar contraseña/i }));
            return screen.getByRole('dialog');
        };

        it('debe abrir el modal precargando el correo limpio y cerrarlo al cancelar', async () => {
            const dialog = openModalWithEmail('  usuario@test.com  ');

            const cpEmailInput = within(dialog).getByLabelText(/Correo Electrónico/i) as HTMLInputElement;
            expect(cpEmailInput.value).toBe('usuario@test.com');

            fireEvent.click(within(dialog).getByRole('button', { name: /Cancelar/i }));

            await waitFor(() => {
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            });
        });

        it('debe validar campos vacíos, contraseñas que no coinciden y contraseña igual a la actual', () => {
            const dialog = openModalWithEmail('');

            // 1. Campos vacíos
            fireEvent.click(within(dialog).getByRole('button', { name: /Actualizar contraseña/i }));
            expect(mockToastShow).toHaveBeenCalledWith({
                severity: 'warn',
                summary: 'Campos requeridos',
                detail: 'Completa todos los campos para continuar.',
            });

            // 2. Nueva contraseña y confirmación no coinciden
            fireEvent.change(within(dialog).getByLabelText(/Correo Electrónico/i), {
                target: { value: 'user@test.com' },
            });
            fireEvent.change(within(dialog).getByLabelText(/Contraseña actual/i), {
                target: { value: 'oldPass123' },
            });
            fireEvent.change(within(dialog).getByLabelText(/^Nueva contraseña$/i), {
                target: { value: 'newPass123' },
            });
            fireEvent.change(within(dialog).getByLabelText(/Confirmar nueva contraseña/i), {
                target: { value: 'otraPass456' },
            });

            fireEvent.click(within(dialog).getByRole('button', { name: /Actualizar contraseña/i }));
            expect(mockToastShow).toHaveBeenCalledWith({
                severity: 'warn',
                summary: 'No coinciden',
                detail: 'La nueva contraseña y su confirmación deben ser iguales.',
            });

            // 3. Nueva contraseña igual a la actual
            fireEvent.change(within(dialog).getByLabelText(/Confirmar nueva contraseña/i), {
                target: { value: 'oldPass123' },
            });
            fireEvent.change(within(dialog).getByLabelText(/^Nueva contraseña$/i), {
                target: { value: 'oldPass123' },
            });

            fireEvent.click(within(dialog).getByRole('button', { name: /Actualizar contraseña/i }));
            expect(mockToastShow).toHaveBeenCalledWith({
                severity: 'warn',
                summary: 'Contraseña sin cambios',
                detail: 'La nueva contraseña debe ser diferente a la actual.',
            });

            expect(AuthService.login).not.toHaveBeenCalled();
            expect(UserService.cambiarPassword).not.toHaveBeenCalled();
        });

        it('debe mostrar error si la validación de credenciales actuales falla', async () => {
            (AuthService.login as jest.Mock).mockResolvedValueOnce({
                status: 401,
            });

            const dialog = openModalWithEmail('user@test.com');

            fireEvent.change(within(dialog).getByLabelText(/Contraseña actual/i), {
                target: { value: 'wrongPass' },
            });
            fireEvent.change(within(dialog).getByLabelText(/^Nueva contraseña$/i), {
                target: { value: 'newPass123' },
            });
            fireEvent.change(within(dialog).getByLabelText(/Confirmar nueva contraseña/i), {
                target: { value: 'newPass123' },
            });

            fireEvent.click(within(dialog).getByRole('button', { name: /Actualizar contraseña/i }));

            await waitFor(() => {
                expect(mockToastShow).toHaveBeenCalledWith({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'El correo o la contraseña actual son incorrectos.',
                });
            });

            expect(UserService.cambiarPassword).not.toHaveBeenCalled();
        });

        it('debe cambiar la contraseña exitosamente al presionar Enter en confirmar y cerrar el modal', async () => {
            (AuthService.login as jest.Mock).mockResolvedValueOnce({
                idUsuario: 42,
                token: 'temp-token',
            });
            (UserService.cambiarPassword as jest.Mock).mockResolvedValueOnce({
                mensaje: 'Clave actualizada correctamente',
            });

            const dialog = openModalWithEmail('');

            fireEvent.change(within(dialog).getByLabelText(/Correo Electrónico/i), {
                target: { value: '  nuevo@test.com  ' },
            });
            fireEvent.change(within(dialog).getByLabelText(/Contraseña actual/i), {
                target: { value: 'oldPass123' },
            });
            fireEvent.change(within(dialog).getByLabelText(/^Nueva contraseña$/i), {
                target: { value: 'newPass123' },
            });

            const confirmInput = within(dialog).getByLabelText(/Confirmar nueva contraseña/i);
            fireEvent.change(confirmInput, { target: { value: 'newPass123' } });

            fireEvent.keyDown(confirmInput, { key: 'Escape' });
            fireEvent.keyDown(confirmInput, { key: 'Enter' });

            await waitFor(() => {
                expect(AuthService.login).toHaveBeenCalledWith({
                    email: 'nuevo@test.com',
                    password: 'oldPass123',
                });
                expect(UserService.cambiarPassword).toHaveBeenCalledWith(
                    42,
                    {
                        passwordActual: 'oldPass123',
                        nuevaPassword: 'newPass123',
                    },
                    'temp-token'
                );
            });

            expect(mockToastShow).toHaveBeenCalledWith({
                severity: 'success',
                summary: 'Contraseña Actualizada',
                detail: 'Clave actualizada correctamente',
            });

            await waitFor(() => {
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            });

            expect((screen.getByPlaceholderText('correo@ejemplo.com') as HTMLInputElement).value).toBe('nuevo@test.com');
        });

        it('debe manejar errores lanzados por UserService.cambiarPassword', async () => {
            (AuthService.login as jest.Mock).mockResolvedValueOnce({
                idUsuario: 42,
                token: 'temp-token',
            });
            (UserService.cambiarPassword as jest.Mock).mockRejectedValueOnce({});

            const dialog = openModalWithEmail('user@test.com');

            fireEvent.change(within(dialog).getByLabelText(/Contraseña actual/i), {
                target: { value: 'oldPass123' },
            });
            fireEvent.change(within(dialog).getByLabelText(/^Nueva contraseña$/i), {
                target: { value: 'newPass123' },
            });
            fireEvent.change(within(dialog).getByLabelText(/Confirmar nueva contraseña/i), {
                target: { value: 'newPass123' },
            });

            fireEvent.click(within(dialog).getByRole('button', { name: /Actualizar contraseña/i }));

            await waitFor(() => {
                expect(mockToastShow).toHaveBeenCalledWith({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo cambiar la contraseña.',
                });
            });
        });
    });
});