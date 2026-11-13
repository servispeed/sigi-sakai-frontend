import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterPage from '@/app/(full-page)/auth/register/page';
import { LayoutContext } from '../../../../layout/context/layoutcontext';
import { registrarUsuario } from '@/app/service/userService';

jest.mock('next/navigation', () => ({
    useRouter: jest.fn()
}));

jest.mock('@/app/service/userService', () => ({
    registrarUsuario: jest.fn()
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

describe('Integración: RegisterPage', () => {
    const mockPush = jest.fn();
    const mockBack = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        
        const { useRouter } = require('next/navigation');
        useRouter.mockReturnValue({ push: mockPush, back: mockBack });
    });

    it('1. Debe renderizar los elementos clave del formulario', () => {
        renderWithContext(<RegisterPage />);
        
        expect(screen.getByText('Agregar colaborador')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Nombre/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Correo Electronico/i)).toBeInTheDocument();
        expect(screen.getAllByText('Selecciona su rol')[0]).toBeInTheDocument(); 
        expect(screen.getByPlaceholderText(/Contraseña/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Agregar/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Volver a la pagina anterior/i })).toBeInTheDocument();
    });

    it('2. Debe mostrar advertencia si faltan campos por llenar', async () => {
        renderWithContext(<RegisterPage />);
        
        const agregarButton = screen.getByRole('button', { name: /Agregar/i });
        fireEvent.click(agregarButton);

        await waitFor(() => {
            expect(screen.getByText('Todos los campos son obligatorios')).toBeInTheDocument();
        });
        
        expect(registrarUsuario).not.toHaveBeenCalled();
    });

    it('3. Debe registrar usuario exitosamente y redirigir al login', async () => {
        (registrarUsuario as jest.Mock).mockResolvedValueOnce({ id: 10, mensaje: 'OK' });

        renderWithContext(<RegisterPage />);

        fireEvent.change(screen.getByPlaceholderText(/Nombre/i), { target: { value: 'Juan Perez' } });
        fireEvent.change(screen.getByPlaceholderText(/Correo Electronico/i), { target: { value: 'juan@ejemplo.com' } });
        fireEvent.change(screen.getByPlaceholderText(/Contraseña/i), { target: { value: 'secreta123' } });

        const dropdownTrigger = screen.getAllByText('Selecciona su rol')[0];
        fireEvent.click(dropdownTrigger);
        const optionDesigner = screen.getByText('Diseñador');
        fireEvent.click(optionDesigner);

        fireEvent.click(screen.getByRole('button', { name: /Agregar/i }));

        await waitFor(() => {
            expect(registrarUsuario).toHaveBeenCalledWith({
                nombre: 'Juan Perez',
                email: 'juan@ejemplo.com',
                password: 'secreta123',
                rol: 5
            });
            expect(screen.getByText('Usuario registrado exitosamente')).toBeInTheDocument();
        });

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/auth/login');
        }, { timeout: 1500 });
    });

    it('4. Debe atrapar errores del servidor y mostrar un mensaje de error', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        (registrarUsuario as jest.Mock).mockRejectedValueOnce(new Error('Fallo del servidor'));

        renderWithContext(<RegisterPage />);

        fireEvent.change(screen.getByPlaceholderText(/Nombre/i), { target: { value: 'Error User' } });
        fireEvent.change(screen.getByPlaceholderText(/Correo Electronico/i), { target: { value: 'error@ejemplo.com' } });
        fireEvent.change(screen.getByPlaceholderText(/Contraseña/i), { target: { value: 'pass' } });
        
        const dropdownTrigger = screen.getAllByText('Selecciona su rol')[0];
        fireEvent.click(dropdownTrigger);
        fireEvent.click(screen.getByText('Mostrador'));

        fireEvent.click(screen.getByRole('button', { name: /Agregar/i }));

        await waitFor(() => {
            expect(screen.getByText('Ocurrió un error al registrar el usuario')).toBeInTheDocument();
        });

        expect(mockPush).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    it('5. Debe regresar a la página anterior al hacer clic en el botón de volver', () => {
        renderWithContext(<RegisterPage />);
        
        const btnReturn = screen.getByRole('button', { name: /Volver a la pagina anterior/i });
        fireEvent.click(btnReturn);

        expect(mockBack).toHaveBeenCalledTimes(1);
    });
});