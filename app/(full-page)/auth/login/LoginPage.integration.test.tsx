import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/(full-page)/auth/login/page';
import { LayoutContext } from '../../../../layout/context/layoutcontext';
import { AuthService } from '@/app/service/authService';

jest.mock('next/navigation', () => ({
    useRouter: jest.fn()
}));

jest.mock('@/app/service/authService', () => ({
    AuthService: {
        login: jest.fn(),
    }
}));

const mockLayoutContext = {
    layoutConfig: { inputStyle: 'outlined' },
    setLayoutConfig: jest.fn(),
    layoutState: {},
    setLayoutState: jest.fn(),
    onMenuToggle: jest.fn(),
    showProfileSidebar: jest.fn()
};

const renderWithContext = (ui: React.ReactElement) => {
    return render(
        <LayoutContext.Provider value={mockLayoutContext as any}>
            {ui}
        </LayoutContext.Provider>
    );
};

describe('Integración: LoginPage', () => {
    const mockPush = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();

        const { useRouter } = require('next/navigation');
        useRouter.mockReturnValue({ push: mockPush });
    });

    it('1. Debe renderizar los elementos clave del formulario', () => {
        renderWithContext(<LoginPage />);

        expect(screen.getByText('Bienvenido!')).toBeInTheDocument();
        expect(screen.getByLabelText(/Correo Electrónico/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Contraseña/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument();
    });

    it('2. Debe mostrar alerta si se intenta iniciar sesión con campos vacíos', async () => {
        renderWithContext(<LoginPage />);

        const loginButton = screen.getByRole('button', { name: /Iniciar sesión/i });
        fireEvent.click(loginButton);

        await waitFor(() => {
            expect(screen.getByText('Ingresa correo y contraseña')).toBeInTheDocument();
        });

        expect(AuthService.login).not.toHaveBeenCalled();
    });

    it('3. Debe hacer login exitoso, guardar en localStorage y redirigir', async () => {
        const mockResponse = {
            token: 'fake-jwt-token',
            idUsuario: 1,
            rol: 'ADMIN',
            permisos: ['VER_DASHBOARD', 'GESTIONAR_ORDENES']
        };
        (AuthService.login as jest.Mock).mockResolvedValueOnce(mockResponse);

        renderWithContext(<LoginPage />);

        fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
            target: { value: 'admin@ejemplo.com' }
        });
        fireEvent.change(screen.getByPlaceholderText(/Contraseña/i), {
            target: { value: 'password123' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

        await waitFor(() => {
            expect(AuthService.login).toHaveBeenCalledWith({
                email: 'admin@ejemplo.com',
                password: 'password123'
            });

            expect(localStorage.getItem('token')).toBe('fake-jwt-token');
            expect(JSON.parse(localStorage.getItem('user')!)).toEqual(
                expect.objectContaining({ email: 'admin@ejemplo.com', rol: 'ADMIN' })
            );
        });

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/');
        }, { timeout: 1000 });
    });

    it('4. Debe mostrar error de acceso si las credenciales son inválidas', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        (AuthService.login as jest.Mock).mockRejectedValueOnce(
            new Error('Credenciales inválidas')
        );

        renderWithContext(<LoginPage />);

        fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
            target: { value: 'user@ejemplo.com' }
        });
        fireEvent.change(screen.getByPlaceholderText(/Contraseña/i), {
            target: { value: 'wrongpass' }
        });

        fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

        await waitFor(() => {
            expect(screen.getByText('Error de Acceso')).toBeInTheDocument();
            expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument();
        });

        expect(localStorage.getItem('token')).toBeNull();
        expect(mockPush).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
    });
});