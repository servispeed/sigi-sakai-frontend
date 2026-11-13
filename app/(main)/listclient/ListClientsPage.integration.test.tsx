import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import ListClientsPage from '@/app/(main)/listclient/page';
import { ClientService } from '@/app/service/clientService';
import { CatalogService } from '@/app/service/catalogService';

jest.mock('@/app/service/clientService', () => ({
    ClientService: {
        getAll: jest.fn(),
        getPurchasesCount: jest.fn(),
        delete: jest.fn(),
        getLastPurchase: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        uploadDocuments: jest.fn(),
        updateCredit: jest.fn()
    }
}));

jest.mock('@/app/service/catalogService', () => ({
    CatalogService: {
        getRegimenesFiscales: jest.fn(),
        getUsosCfdi: jest.fn(),
        getProductos: jest.fn()
    }
}));

jest.mock('@/app/components/ClientFormDialog', () => {
    const React = require('react');

    return {
        ClientFormDialog: ({ visible, onSuccess, clientToEdit }: any) =>
            visible ? (
                <div data-testid="client-form-dialog">
                    <span>
                        {clientToEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
                    </span>
                    <button
                        onClick={() => onSuccess({
                            id: 3,
                            nombre: 'Cliente Nuevo'
                        })}
                    >
                        Guardar cliente mock
                    </button>
                </div>
            ) : null
    };
});

jest.mock('@/app/components/LastPurchaseDialog', () => {
    const React = require('react');

    return {
        UltimaCompraDialog: ({ visible, idCliente }: any) =>
            visible ? (
                <div data-testid="last-purchase-dialog">
                    Última compra del cliente {idCliente}
                </div>
            ) : null
    };
});

jest.mock('@/app/components/CreditApplicationDialog', () => {
    const React = require('react');

    return {
        CreditApplicationDialog: ({
            visible,
            client,
            onSuccess,
            onError
        }: any) =>
            visible ? (
                <div data-testid="credit-dialog">
                    <span>Solicitud de crédito: {client?.nombre}</span>
                    <button onClick={onSuccess}>
                        Habilitar crédito mock
                    </button>
                    <button onClick={() => onError('Error de documentos')}>
                        Simular error de crédito
                    </button>
                </div>
            ) : null
    };
});

const mockClients = [
    {
        id: 1,
        nombre: 'Cliente Mostrador',
        email: 'mostrador@test.com',
        telefono: '2291234567',
        rfc: null,
        razonSocial: null,
        direccionFiscal: null,
        idUsoCfdi: null,
        idRegimenFiscal: null,
        creditoHabilitado: false,
        estatusCredito: null,
        diasCredito: null,
        limiteCredito: null
    },
    {
        id: 2,
        nombre: 'Empresa de Prueba',
        email: 'empresa@test.com',
        telefono: '2297654321',
        rfc: 'EMP123456ABC',
        razonSocial: 'Empresa de Prueba S.A.',
        direccionFiscal: 'Veracruz, Veracruz',
        idUsoCfdi: 1,
        idRegimenFiscal: 1,
        creditoHabilitado: false,
        estatusCredito: null,
        diasCredito: null,
        limiteCredito: null
    }
];

const waitForInitialLoad = async () => {
    await waitFor(() => {
        expect(ClientService.getAll).toHaveBeenCalled();
        expect(CatalogService.getRegimenesFiscales).toHaveBeenCalled();
        expect(CatalogService.getUsosCfdi).toHaveBeenCalled();
        expect(ClientService.getPurchasesCount).toHaveBeenCalledTimes(2);
        expect(screen.getByText('Cliente Mostrador')).toBeInTheDocument();
    });

    await act(async () => {
        await Promise.resolve();
    });
};

describe('ListClientsPage - Pruebas de integración', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        localStorage.setItem(
            'user',
            JSON.stringify({
                idUsuario: 99,
                rol: 'ADMIN'
            })
        );

        (ClientService.getAll as jest.Mock).mockResolvedValue(mockClients);

        (ClientService.getPurchasesCount as jest.Mock)
            .mockImplementation((id: number) =>
                Promise.resolve(id === 1 ? 2 : 4)
            );

        (ClientService.delete as jest.Mock).mockResolvedValue(true);

        (CatalogService.getRegimenesFiscales as jest.Mock).mockResolvedValue([
            {
                idRegimen: 1,
                clave: '601',
                descripcion: 'General de Ley Personas Morales'
            }
        ]);

        (CatalogService.getUsosCfdi as jest.Mock).mockResolvedValue([
            {
                idUsoCfdi: 1,
                clave: 'G03',
                descripcion: 'Gastos en general'
            }
        ]);
    });

    afterEach(() => {
        jest.restoreAllMocks();
        localStorage.clear();
    });

    it('debe cargar los clientes y catálogos al iniciar', async () => {
        render(<ListClientsPage />);
        await waitForInitialLoad();
        expect(screen.getByText('Lista de clientes')).toBeInTheDocument();

        await waitFor(() => {
            expect(ClientService.getAll).toHaveBeenCalledWith('todos');
            expect(CatalogService.getRegimenesFiscales).toHaveBeenCalled();
            expect(CatalogService.getUsosCfdi).toHaveBeenCalled();
        });

        expect(ClientService.getPurchasesCount).toHaveBeenCalledWith(1);
        expect(ClientService.getPurchasesCount).toHaveBeenCalledWith(2);

        expect(await screen.findByText('Cliente Mostrador')).toBeInTheDocument();
        expect(screen.getByText('Empresa de Prueba')).toBeInTheDocument();

        expect(screen.getByText('601 General de Ley Personas Morales'))
            .toBeInTheDocument();

        expect(screen.getByText('G03 Gastos en general'))
            .toBeInTheDocument();
    });

    it('debe filtrar los clientes por tipo', async () => {
        render(<ListClientsPage />);
        await waitForInitialLoad();
        await screen.findByText('Cliente Mostrador');

        fireEvent.click(screen.getByRole('button', {
            name: 'Mostrador'
        }));

        await waitFor(() => {
            expect(ClientService.getAll).toHaveBeenLastCalledWith('mostrador');
        });
    });

    it('debe permitir buscar clientes mediante el filtro global', async () => {
        render(<ListClientsPage />);
        await waitForInitialLoad();
        await screen.findByText('Cliente Mostrador');

        const searchInput = screen.getByPlaceholderText('Buscar cliente...');

        fireEvent.change(searchInput, {
            target: { value: 'Empresa de Prueba' }
        });

        expect(screen.getByText('Empresa de Prueba')).toBeInTheDocument();
        expect(screen.queryByText('Cliente Mostrador')).not.toBeInTheDocument();
    });

    it('debe abrir el formulario para registrar un nuevo cliente', async () => {
        render(<ListClientsPage />);
        await waitForInitialLoad();
        fireEvent.click(screen.getByRole('button', {
            name: /Agregar cliente/i
        }));

        expect(screen.getByTestId('client-form-dialog')).toBeInTheDocument();
        expect(screen.getByText('Nuevo Cliente')).toBeInTheDocument();
    });

    it('debe actualizar la lista después de guardar un cliente', async () => {
        render(<ListClientsPage />);
        await waitForInitialLoad();
        await screen.findByText('Cliente Mostrador');

        fireEvent.click(screen.getByRole('button', {
            name: /Agregar cliente/i
        }));

        fireEvent.click(screen.getByRole('button', {
            name: /Guardar cliente mock/i
        }));

        await waitFor(() => {
            expect(ClientService.getAll).toHaveBeenCalledTimes(2);
        });

        expect(screen.queryByTestId('client-form-dialog')).not.toBeInTheDocument();
    });

    it('debe abrir el formulario con los datos del cliente seleccionado para editarlo', async () => {
        render(<ListClientsPage />);
        await waitForInitialLoad();
        const clientName = await screen.findByText('Cliente Mostrador');
        const row = clientName.closest('tr');

        expect(row).not.toBeNull();

        const buttons = within(row as HTMLElement).getAllByRole('button');

        fireEvent.click(buttons[1]);

        expect(screen.getByTestId('client-form-dialog')).toBeInTheDocument();
        expect(screen.getByText('Editar Cliente')).toBeInTheDocument();
    });

    it('debe eliminar un cliente después de confirmar la acción', async () => {
        render(<ListClientsPage />);
        await waitForInitialLoad();
        const clientName = await screen.findByText('Cliente Mostrador');
        const row = clientName.closest('tr');

        expect(row).not.toBeNull();

        const buttons = within(row as HTMLElement).getAllByRole('button');

        fireEvent.click(buttons[2]);

        expect(screen.getByText(/¿Estás seguro de que quieres eliminar a/i))
            .toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {
            name: 'Sí'
        }));

        await waitFor(() => {
            expect(ClientService.delete).toHaveBeenCalledWith(1);
        });

        expect(screen.queryByText('Cliente Mostrador')).not.toBeInTheDocument();
    });

    it('debe mostrar un error cuando no se puede eliminar un cliente', async () => {
        const deleteSpy = jest
            .spyOn(ClientService, 'delete')
            .mockRejectedValue(new Error('Error al eliminar cliente'));

        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => { });

        render(<ListClientsPage />);

        await waitForInitialLoad();

        const clientRow = screen.getByRole('row', {
            name: /Cliente Mostrador/i
        });

        const actionButtons = within(clientRow).getAllByRole('button');

        fireEvent.click(actionButtons[2]);

        fireEvent.click(
            await screen.findByRole('button', { name: /Sí/i })
        );

        await waitFor(() => {
            expect(deleteSpy).toHaveBeenCalledWith(1);
        });

        expect(
            within(clientRow).getByText('Cliente Mostrador')
        ).toBeInTheDocument();

        expect(
            await screen.findByText('No se pudo eliminar el cliente')
        ).toBeInTheDocument();

        deleteSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    it('debe abrir el diálogo de última compra del cliente seleccionado', async () => {
        render(<ListClientsPage />);
        await waitForInitialLoad();
        const clientName = await screen.findByText('Cliente Mostrador');
        const row = clientName.closest('tr');

        const buttons = within(row as HTMLElement).getAllByRole('button');

        fireEvent.click(buttons[0]);

        expect(screen.getByTestId('last-purchase-dialog')).toBeInTheDocument();
        expect(screen.getByText('Última compra del cliente 1')).toBeInTheDocument();
    });

    it('debe permitir solicitar crédito a un usuario administrador cuando el cliente supera tres compras', async () => {
        render(<ListClientsPage />);
        await waitForInitialLoad();
        const clientName = await screen.findByText('Empresa de Prueba');
        const row = clientName.closest('tr');

        const buttons = within(row as HTMLElement).getAllByRole('button');

        fireEvent.click(buttons[0]);

        expect(screen.getByTestId('credit-dialog')).toBeInTheDocument();
        expect(screen.getByText('Solicitud de crédito: Empresa de Prueba'))
            .toBeInTheDocument();
    });

    it('debe actualizar los clientes cuando se habilita el crédito', async () => {
        render(<ListClientsPage />);
        await waitForInitialLoad();
        const clientName = await screen.findByText('Empresa de Prueba');
        const row = clientName.closest('tr');

        const buttons = within(row as HTMLElement).getAllByRole('button');

        fireEvent.click(buttons[0]);

        fireEvent.click(screen.getByRole('button', {
            name: /Habilitar crédito mock/i
        }));

        await waitFor(() => {
            expect(ClientService.getAll).toHaveBeenCalledTimes(2);
        });

        expect(screen.queryByTestId('credit-dialog')).not.toBeInTheDocument();
    });

    it('no debe permitir solicitar crédito a usuarios sin permisos administrativos', async () => {
        localStorage.setItem(
            'user',
            JSON.stringify({
                idUsuario: 10,
                rol: 'EMPLEADO'
            })
        );

        render(<ListClientsPage />);
        await waitForInitialLoad();
        const clientName = await screen.findByText('Empresa de Prueba');
        const row = clientName.closest('tr');

        expect(within(row as HTMLElement).getAllByRole('button')).toHaveLength(3);
        expect(screen.queryByTestId('credit-dialog')).not.toBeInTheDocument();
    });

    it('debe mostrar un error cuando falla la carga de clientes', async () => {
        const getAllSpy = jest
            .spyOn(ClientService, 'getAll')
            .mockRejectedValue(new Error('Error al cargar clientes'));

        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => { });

        render(<ListClientsPage />);

        await waitFor(() => {
            expect(getAllSpy).toHaveBeenCalledWith('todos');
        });

        expect(
            await screen.findByText('No se pudieron cargar los clientes')
        ).toBeInTheDocument();

        expect(ClientService.getPurchasesCount).not.toHaveBeenCalled();

        getAllSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });
});
