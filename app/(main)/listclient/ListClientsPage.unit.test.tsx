import React, { forwardRef, useImperativeHandle } from 'react';
import {
    render,
    screen,
    waitFor,
    fireEvent,
    within
} from '@testing-library/react';
import '@testing-library/jest-dom';

import ListClientsPage from './page';
import { ClientService } from '@/app/service/clientService';
import { CatalogService } from '@/app/service/catalogService';

const mockShowToast = jest.fn();

jest.mock('primereact/toast', () => ({
    Toast: forwardRef((props: any, ref: any) => {
        useImperativeHandle(ref, () => ({
            show: mockShowToast,
            clear: jest.fn()
        }));

        return <div data-testid="toast" />;
    })
}));

jest.mock('@/app/service/clientService', () => ({
    ClientService: {
        getAll: jest.fn(),
        getPurchasesCount: jest.fn(),
        delete: jest.fn()
    }
}));

jest.mock('@/app/service/catalogService', () => ({
    CatalogService: {
        getRegimenesFiscales: jest.fn(),
        getUsosCfdi: jest.fn()
    }
}));

jest.mock('next/link', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
        <>{children}</>
    )
}));

jest.mock('primereact/api', () => {
    const actual = jest.requireActual('primereact/api');

    return {
        ...actual,
        FilterMatchMode: {
            ...actual.FilterMatchMode,
            CONTAINS: 'contains'
        }
    };
});

jest.mock('primereact/button', () => ({
    Button: ({
        label,
        icon,
        tooltip,
        onClick,
        disabled,
        loading,
        children,
        ...props
    }: any) => (
        <button
            type="button"
            aria-label={
                label ||
                props['aria-label'] ||
                tooltip ||
                icon ||
                'Botón'
            }
            title={tooltip}
            disabled={disabled || loading}
            onClick={onClick}
        >
            {icon && <span aria-hidden="true">{icon}</span>}
            {label || children}
        </button>
    )
}));

jest.mock('primereact/inputtext', () => ({
    InputText: ({ value, onChange, placeholder, ...props }: any) => (
        <input
            type="text"
            value={value ?? ''}
            onChange={onChange}
            placeholder={placeholder}
            aria-label={placeholder}
            {...props}
        />
    )
}));

jest.mock('primereact/selectbutton', () => ({
    SelectButton: ({ value, onChange, options }: any) => (
        <div role="group" aria-label="Filtro de clientes">
            {options.map((option: any) => (
                <button
                    key={option.value}
                    type="button"
                    aria-pressed={value === option.value}
                    onClick={() => onChange({ value: option.value })}
                >
                    {option.label}
                </button>
            ))}
        </div>
    )
}));

jest.mock('primereact/column', () => ({
    Column: () => null
}));

jest.mock('primereact/datatable', () => ({
    DataTable: ({
        value = [],
        children,
        header,
        filters,
        globalFilterFields = [],
        emptyMessage,
        loading
    }: any) => {
        const columns = React.Children.toArray(children).filter(
            (child: any) => child?.props
        ) as React.ReactElement[];

        const searchValue = String(filters?.global?.value ?? '')
            .trim()
            .toLowerCase();

        const filteredRows = value.filter((row: any) => {
            if (!searchValue) return true;

            return globalFilterFields.some((field: string) =>
                String(row[field] ?? '')
                    .toLowerCase()
                    .includes(searchValue)
            );
        });

        return (
            <div>
                {header}

                <div data-testid="datatable-loading">
                    {loading ? 'Cargando...' : 'Cargado'}
                </div>

                <table>
                    <thead>
                        <tr>
                            {columns.map((column, index) => (
                                <th key={index}>
                                    {column.props.header ?? ''}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {filteredRows.map((row: any, rowIndex: number) => (
                            <tr key={row.id ?? rowIndex}>
                                {columns.map((column, columnIndex) => {
                                    const { body, field } = column.props;

                                    const content = body
                                        ? body(row)
                                        : row[field] ?? '';

                                    return (
                                        <td key={columnIndex}>
                                            {content}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}

                        {filteredRows.length === 0 && (
                            <tr>
                                <td colSpan={columns.length || 1}>
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    }
}));

jest.mock('primereact/dialog', () => ({
    Dialog: ({
        visible,
        header,
        children,
        footer,
        onHide
    }: any) => {
        if (!visible) return null;

        return (
            <div role="dialog" aria-label={header || 'Diálogo'}>
                {header && <h2>{header}</h2>}

                <div>{children}</div>

                <div>{footer}</div>

                <button type="button" onClick={onHide}>
                    Cerrar diálogo
                </button>
            </div>
        );
    }
}));

jest.mock('@/app/components/ClientFormDialog', () => ({
    ClientFormDialog: ({
        visible,
        onHide,
        onSuccess,
        clientToEdit
    }: any) => {
        if (!visible) return null;

        return (
            <div role="dialog" aria-label="Formulario de cliente">
                <span data-testid="client-edit-id">
                    {clientToEdit?.id ?? 'nuevo'}
                </span>

                <button type="button" onClick={onSuccess}>
                    Guardar cliente simulado
                </button>

                <button type="button" onClick={onHide}>
                    Cerrar formulario
                </button>
            </div>
        );
    }
}));

jest.mock('@/app/components/LastPurchaseDialog', () => ({
    UltimaCompraDialog: ({
        visible,
        idCliente,
        onHide
    }: any) => {
        if (!visible) return null;

        return (
            <div role="dialog" aria-label="Última compra">
                <span data-testid="ultima-compra-cliente-id">
                    {idCliente}
                </span>

                <button type="button" onClick={onHide}>
                    Cerrar última compra
                </button>
            </div>
        );
    }
}));

jest.mock('@/app/components/CreditApplicationDialog', () => ({
    CreditApplicationDialog: ({
        visible,
        client,
        onHide,
        onSuccess,
        onError
    }: any) => {
        if (!visible) return null;

        return (
            <div role="dialog" aria-label="Solicitud de crédito">
                <span data-testid="credit-dialog">
                    {client?.nombre}
                </span>

                <button type="button" onClick={onSuccess}>
                    Habilitar crédito mock
                </button>

                <button
                    type="button"
                    onClick={() => onError('Error al habilitar crédito')}
                >
                    Simular error de crédito
                </button>

                <button type="button" onClick={onHide}>
                    Cerrar solicitud
                </button>
            </div>
        );
    }
}));

const mockClients = [
    {
        id: 1,
        nombre: 'Cliente Mostrador',
        email: 'cliente@ejemplo.com',
        telefono: '2291234567',
        rfc: 'XAXX010101000',
        razonSocial: 'Empresa de prueba',
        direccionFiscal: 'Veracruz, Veracruz',
        idUsoCfdi: 1,
        idRegimenFiscal: 601,
        creditoHabilitado: false,
        estatusCredito: null,
        diasCredito: null,
        limiteCredito: null
    },
    {
        id: 2,
        nombre: 'Empresa de Prueba',
        email: 'empresa@ejemplo.com',
        telefono: '2297654321',
        rfc: 'ABC010101AAA',
        razonSocial: 'Empresa de Prueba SA',
        direccionFiscal: 'Boca del Río, Veracruz',
        idUsoCfdi: 1,
        idRegimenFiscal: 601,
        creditoHabilitado: false,
        estatusCredito: null,
        diasCredito: null,
        limiteCredito: null
    }
];

const mockRegimenes = [
    {
        idRegimen: 601,
        clave: '601',
        descripcion: 'General de Ley Personas Morales'
    }
];

const mockUsosCfdi = [
    {
        idUsoCfdi: 1,
        clave: 'G03',
        descripcion: 'Gastos en general'
    }
];

const waitForInitialLoad = async () => {
    await waitFor(() => {
        expect(ClientService.getAll).toHaveBeenCalledWith('todos');
        expect(CatalogService.getRegimenesFiscales).toHaveBeenCalled();
        expect(CatalogService.getUsosCfdi).toHaveBeenCalled();

        expect(screen.getByText('Cliente Mostrador')).toBeInTheDocument();
        expect(screen.getByText('Empresa de Prueba')).toBeInTheDocument();
    });
};

const getClientRow = async (clientName: string) => {
    const client = await screen.findByText(clientName);
    const row = client.closest('tr');

    expect(row).not.toBeNull();

    return row as HTMLElement;
};

const waitForActionButtons = async (
    row: HTMLElement,
    expectedCount: number
) => {
    await waitFor(() => {
        expect(
            within(row).getAllByRole('button')
        ).toHaveLength(expectedCount);
    });
};

describe('ListClientsPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        localStorage.setItem(
            'user',
            JSON.stringify({
                idUsuario: 1,
                rol: 'ADMIN'
            })
        );

        jest.mocked(ClientService.getAll).mockResolvedValue(
            mockClients as any
        );

        jest.mocked(ClientService.getPurchasesCount).mockResolvedValue(4);

        jest.mocked(ClientService.delete).mockResolvedValue(undefined as any);

        jest.mocked(CatalogService.getRegimenesFiscales).mockResolvedValue(
            mockRegimenes as any
        );

        jest.mocked(CatalogService.getUsosCfdi).mockResolvedValue(
            mockUsosCfdi as any
        );
    });

    afterEach(() => {
        localStorage.clear();
        jest.restoreAllMocks();
    });

    describe('Carga inicial', () => {
        it('muestra el título y el botón para agregar clientes', async () => {
            render(<ListClientsPage />);

            expect(
                screen.getByRole('heading', {
                    name: 'Lista de clientes'
                })
            ).toBeInTheDocument();

            expect(
                screen.getByRole('button', {
                    name: 'Agregar cliente'
                })
            ).toBeInTheDocument();

            await waitForInitialLoad();
        });

        it('consulta clientes y catálogos al cargar la página', async () => {
            render(<ListClientsPage />);

            await waitForInitialLoad();

            expect(ClientService.getAll).toHaveBeenCalledWith('todos');
            expect(CatalogService.getRegimenesFiscales).toHaveBeenCalledTimes(1);
            expect(CatalogService.getUsosCfdi).toHaveBeenCalledTimes(1);
        });

        it('muestra los datos de los clientes en la tabla', async () => {
            render(<ListClientsPage />);

            await waitForInitialLoad();

            expect(screen.getByText('cliente@ejemplo.com')).toBeInTheDocument();
            expect(screen.getByText('2291234567')).toBeInTheDocument();
            expect(screen.getByText('XAXX010101000')).toBeInTheDocument();
            expect(screen.getByText('empresa@ejemplo.com')).toBeInTheDocument();
        });

        it('muestra el régimen fiscal y el uso de CFDI', async () => {
            render(<ListClientsPage />);

            await waitForInitialLoad();

            expect(
                screen.getAllByText(
                    '601 General de Ley Personas Morales'
                )
            ).toHaveLength(2);

            expect(
                screen.getAllByText('G03 Gastos en general')
            ).toHaveLength(2);
        });

        it('muestra guiones si no encuentra los datos fiscales', async () => {
            jest.mocked(ClientService.getAll).mockResolvedValueOnce([
                {
                    ...mockClients[0],
                    idRegimenFiscal: 999,
                    idUsoCfdi: 999
                }
            ] as any);

            render(<ListClientsPage />);

            await screen.findByText('Cliente Mostrador');

            const row = await getClientRow('Cliente Mostrador');

            expect(within(row).getAllByText('-')).toHaveLength(2);
        });

        it('muestra el mensaje cuando no hay clientes', async () => {
            jest.mocked(ClientService.getAll).mockResolvedValueOnce([]);

            render(<ListClientsPage />);

            expect(
                await screen.findByText('No se encontraron clientes.')
            ).toBeInTheDocument();
        });

        it('muestra el estado de crédito inactivo cuando no está habilitado', async () => {
            render(<ListClientsPage />);

            await waitForInitialLoad();

            expect(screen.getAllByText('Inactivo')).toHaveLength(2);
        });
    });

    describe('Filtros de clientes', () => {
        it('muestra las opciones de filtro', async () => {
            render(<ListClientsPage />);

            await waitForInitialLoad();

            expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Mostrador' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Fiscales' })).toBeInTheDocument();
        });

        it('consulta los clientes del filtro Mostrador', async () => {
            render(<ListClientsPage />);

            await waitForInitialLoad();

            fireEvent.click(screen.getByRole('button', { name: 'Mostrador' }));

            await waitFor(() => {
                expect(ClientService.getAll).toHaveBeenCalledWith('mostrador');
            });
        });

        it('consulta los clientes del filtro Fiscales', async () => {
            render(<ListClientsPage />);

            await waitForInitialLoad();

            fireEvent.click(screen.getByRole('button', { name: 'Fiscales' }));

            await waitFor(() => {
                expect(ClientService.getAll).toHaveBeenCalledWith('factura');
            });
        });

        it('no cambia el filtro cuando el valor recibido es nulo', async () => {
            render(<ListClientsPage />);

            await waitForInitialLoad();

            expect(
                screen.getByRole('button', { name: 'Todos' })
            ).toHaveAttribute('aria-pressed', 'true');
        });
    });

    describe('Búsqueda de clientes', () => {
        it('filtra clientes por nombre', async () => {
            render(<ListClientsPage />);

            await waitForInitialLoad();

            fireEvent.change(
                screen.getByPlaceholderText('Buscar cliente...'),
                { target: { value: 'Empresa de Prueba' } }
            );

            expect(screen.getByText('Empresa de Prueba')).toBeInTheDocument();
            expect(screen.queryByText('Cliente Mostrador')).not.toBeInTheDocument();
        });

        it('filtra clientes por correo electrónico', async () => {
            render(<ListClientsPage />);

            await waitForInitialLoad();

            fireEvent.change(
                screen.getByPlaceholderText('Buscar cliente...'),
                { target: { value: 'cliente@ejemplo.com' } }
            );

            expect(screen.getByText('Cliente Mostrador')).toBeInTheDocument();
            expect(screen.queryByText('Empresa de Prueba')).not.toBeInTheDocument();
        });

        it('muestra el mensaje cuando la búsqueda no encuentra resultados', async () => {
            render(<ListClientsPage />);

            await waitForInitialLoad();

            fireEvent.change(
                screen.getByPlaceholderText('Buscar cliente...'),
                { target: { value: 'Cliente inexistente' } }
            );

            expect(
                screen.getByText('No se encontraron clientes.')
            ).toBeInTheDocument();
        });
    });

    describe('Alta y edición de clientes', () => {
        it('abre el formulario para agregar un cliente nuevo', async () => {
            render(<ListClientsPage />);

            await waitForInitialLoad();

            fireEvent.click(
                screen.getByRole('button', { name: 'Agregar cliente' })
            );

            expect(
                screen.getByRole('dialog', {
                    name: 'Formulario de cliente'
                })
            ).toBeInTheDocument();

            expect(screen.getByTestId('client-edit-id')).toHaveTextContent('nuevo');
        });

        it('abre el formulario con los datos del cliente seleccionado', async () => {
            render(<ListClientsPage />);

            await waitForInitialLoad();

            const row = await getClientRow('Cliente Mostrador');
            await waitForActionButtons(row, 4);

            fireEvent.click(
                within(row).getByRole('button', { name: 'Editar' })
            );

            expect(
                screen.getByRole('dialog', {
                    name: 'Formulario de cliente'
                })
            ).toBeInTheDocument();

            expect(screen.getByTestId('client-edit-id')).toHaveTextContent('1');
        });

        it('cierra el formulario al cancelar', async () => {
            render(<ListClientsPage />);

            await waitForInitialLoad();

            fireEvent.click(
                screen.getByRole('button', { name: 'Agregar cliente' })
            );

            fireEvent.click(
                screen.getByRole('button', { name: 'Cerrar formulario' })
            );

            expect(
                screen.queryByRole('dialog', {
                    name: 'Formulario de cliente'
                })
            ).not.toBeInTheDocument();
        });

        it('recarga los clientes cuando el formulario informa un guardado exitoso', async () => {
            render(<ListClientsPage />);

            await waitForInitialLoad();

            const llamadasIniciales = jest.mocked(ClientService.getAll).mock.calls.length;

            fireEvent.click(
                screen.getByRole('button', { name: 'Agregar cliente' })
            );

            fireEvent.click(
                screen.getByRole('button', {
                    name: 'Guardar cliente simulado'
                })
            );

            await waitFor(() => {
                expect(ClientService.getAll).toHaveBeenCalledTimes(
                    llamadasIniciales + 1
                );
            });

            expect(
                screen.queryByRole('dialog', {
                    name: 'Formulario de cliente'
                })
            ).not.toBeInTheDocument();
        });
    });

    describe('Última compra', () => {
        it('abre el diálogo de última compra con el ID correcto', async () => {
            render(<ListClientsPage />);

            await waitForInitialLoad();

            const row = await getClientRow('Cliente Mostrador');
            await waitForActionButtons(row, 4);

            fireEvent.click(
                within(row).getByRole('button', {
                    name: 'Última compra'
                })
            );

            expect(
                screen.getByRole('dialog', { name: 'Última compra' })
            ).toBeInTheDocument();

            expect(
                screen.getByTestId('ultima-compra-cliente-id')
            ).toHaveTextContent('1');
        });

        it('cierra el diálogo de última compra', async () => {
            render(<ListClientsPage />);

            await waitForInitialLoad();

            const row = await getClientRow('Cliente Mostrador');
            await waitForActionButtons(row, 4);

            fireEvent.click(
                within(row).getByRole('button', {
                    name: 'Última compra'
                })
            );

            fireEvent.click(
                screen.getByRole('button', {
                    name: 'Cerrar última compra'
                })
            );

            expect(
                screen.queryByRole('dialog', { name: 'Última compra' })
            ).not.toBeInTheDocument();
        });

        it('no abre la última compra si el cliente no tiene ID', async () => {
            jest.mocked(ClientService.getAll).mockResolvedValueOnce([
                {
                    ...mockClients[0],
                    id: null
                }
            ] as any);

            render(<ListClientsPage />);

            const row = await getClientRow('Cliente Mostrador');
            await waitForActionButtons(row, 4);

            fireEvent.click(
                within(row).getByRole('button', {
                    name: 'Última compra'
                })
            );

            expect(
                screen.queryByRole('dialog', { name: 'Última compra' })
            ).not.toBeInTheDocument();
        });
    });

    describe('Solicitud de crédito', () => {
        it('permite solicitar crédito cuando el cliente supera tres compras', async () => {
            jest.mocked(ClientService.getPurchasesCount).mockResolvedValueOnce(4);

            render(<ListClientsPage />);

            await waitForInitialLoad();

            const row = await getClientRow('Empresa de Prueba');
            await waitForActionButtons(row, 4);

            fireEvent.click(
                within(row).getByRole('button', {
                    name: 'Validar y solicitar crédito'
                })
            );

            expect(await screen.findByTestId('credit-dialog')).toHaveTextContent(
                'Empresa de Prueba'
            );

            expect(ClientService.getPurchasesCount).toHaveBeenCalledWith(2);
        });

        it('muestra un aviso cuando el cliente no supera tres compras', async () => {
            jest.mocked(ClientService.getPurchasesCount).mockResolvedValueOnce(3);

            render(<ListClientsPage />);

            await waitForInitialLoad();

            const row = await getClientRow('Cliente Mostrador');
            await waitForActionButtons(row, 4);

            fireEvent.click(
                within(row).getByRole('button', {
                    name: 'Validar y solicitar crédito'
                })
            );

            expect(
                await screen.findByRole('dialog', {
                    name: 'Criterio de crédito no cumplido'
                })
            ).toBeInTheDocument();

            expect(
                screen.getByText('Compras completadas actuales:')
            ).toBeInTheDocument();

            expect(
                screen.getByText('Requisito mínimo:')
            ).toBeInTheDocument();

            expect(
                screen.queryByTestId('credit-dialog')
            ).not.toBeInTheDocument();
        });

        it('cierra el aviso de criterio de crédito no cumplido', async () => {
            jest.mocked(ClientService.getPurchasesCount).mockResolvedValueOnce(2);

            render(<ListClientsPage />);

            await waitForInitialLoad();

            const row = await getClientRow('Cliente Mostrador');
            await waitForActionButtons(row, 4);

            fireEvent.click(
                within(row).getByRole('button', {
                    name: 'Validar y solicitar crédito'
                })
            );

            await screen.findByRole('dialog', {
                name: 'Criterio de crédito no cumplido'
            });

            fireEvent.click(
                screen.getByRole('button', { name: 'Entendido' })
            );

            expect(
                screen.queryByRole('dialog', {
                    name: 'Criterio de crédito no cumplido'
                })
            ).not.toBeInTheDocument();
        });

        it('muestra un error cuando no puede consultar las compras del cliente', async () => {
            jest.mocked(ClientService.getPurchasesCount).mockRejectedValueOnce(
                new Error('Error de conexión')
            );

            render(<ListClientsPage />);

            await waitForInitialLoad();

            const row = await getClientRow('Empresa de Prueba');
            await waitForActionButtons(row, 4);

            fireEvent.click(
                within(row).getByRole('button', {
                    name: 'Validar y solicitar crédito'
                })
            );

            await waitFor(() => {
                expect(mockShowToast).toHaveBeenCalledWith(
                    expect.objectContaining({
                        severity: 'error',
                        summary: 'Error de validación',
                        detail: 'No se pudo verificar el historial de compras del cliente.'
                    })
                );
            });

            expect(
                screen.queryByTestId('credit-dialog')
            ).not.toBeInTheDocument();
        });

        it('actualiza los clientes cuando se habilita el crédito', async () => {
            jest.mocked(ClientService.getPurchasesCount).mockResolvedValueOnce(4);

            render(<ListClientsPage />);

            await waitForInitialLoad();

            const row = await getClientRow('Empresa de Prueba');
            await waitForActionButtons(row, 4);

            const llamadasIniciales = jest.mocked(ClientService.getAll).mock.calls.length;

            fireEvent.click(
                within(row).getByRole('button', {
                    name: 'Validar y solicitar crédito'
                })
            );

            await screen.findByTestId('credit-dialog');

            fireEvent.click(
                screen.getByRole('button', {
                    name: 'Habilitar crédito mock'
                })
            );

            await waitFor(() => {
                expect(ClientService.getAll).toHaveBeenCalledTimes(
                    llamadasIniciales + 1
                );
            });

            expect(
                screen.queryByTestId('credit-dialog')
            ).not.toBeInTheDocument();

            expect(mockShowToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'success',
                    summary: 'Crédito habilitado'
                })
            );
        });

        it('muestra el error recibido del diálogo de crédito', async () => {
            jest.mocked(ClientService.getPurchasesCount).mockResolvedValueOnce(4);

            render(<ListClientsPage />);

            await waitForInitialLoad();

            const row = await getClientRow('Empresa de Prueba');
            await waitForActionButtons(row, 4);

            fireEvent.click(
                within(row).getByRole('button', {
                    name: 'Validar y solicitar crédito'
                })
            );

            await screen.findByTestId('credit-dialog');

            fireEvent.click(
                screen.getByRole('button', {
                    name: 'Simular error de crédito'
                })
            );

            expect(mockShowToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Error al habilitar crédito'
                })
            );
        });
    });

    describe('Eliminación de clientes', () => {
        it('abre el diálogo de confirmación', async () => {
            render(<ListClientsPage />);

            await waitForInitialLoad();

            const row = await getClientRow('Cliente Mostrador');
            await waitForActionButtons(row, 4);

            fireEvent.click(
                within(row).getByRole('button', { name: 'Eliminar' })
            );

            expect(
                screen.getByRole('dialog', { name: 'Confirmar' })
            ).toBeInTheDocument();

            expect(
                screen.getByText(/quieres eliminar a/i)
            ).toBeInTheDocument();
        });

        it('cierra la confirmación al seleccionar No', async () => {
            render(<ListClientsPage />);

            await waitForInitialLoad();

            const row = await getClientRow('Cliente Mostrador');
            await waitForActionButtons(row, 4);

            fireEvent.click(
                within(row).getByRole('button', { name: 'Eliminar' })
            );

            fireEvent.click(
                screen.getByRole('button', { name: 'No' })
            );

            expect(
                screen.queryByRole('dialog', { name: 'Confirmar' })
            ).not.toBeInTheDocument();

            expect(ClientService.delete).not.toHaveBeenCalled();
        });

        it('elimina correctamente un cliente', async () => {
            render(<ListClientsPage />);

            await waitForInitialLoad();

            const row = await getClientRow('Cliente Mostrador');
            await waitForActionButtons(row, 4);

            fireEvent.click(
                within(row).getByRole('button', { name: 'Eliminar' })
            );

            fireEvent.click(
                screen.getByRole('button', { name: 'Sí' })
            );

            await waitFor(() => {
                expect(ClientService.delete).toHaveBeenCalledWith(1);
            });

            await waitFor(() => {
                expect(
                    screen.queryByText('Cliente Mostrador')
                ).not.toBeInTheDocument();
            });

            expect(mockShowToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'success',
                    summary: 'Eliminado',
                    detail: 'Cliente eliminado'
                })
            );
        });

        it('muestra un error cuando falla la eliminación', async () => {
            jest.mocked(ClientService.delete).mockRejectedValueOnce(
                new Error('Error de eliminación')
            );

            render(<ListClientsPage />);

            await waitForInitialLoad();

            const row = await getClientRow('Cliente Mostrador');
            await waitForActionButtons(row, 4);

            fireEvent.click(
                within(row).getByRole('button', { name: 'Eliminar' })
            );

            const dialog = screen.getByRole('dialog', {
                name: 'Confirmar'
            });

            fireEvent.click(
                within(dialog).getByRole('button', { name: 'Sí' })
            );

            await waitFor(() => {
                expect(mockShowToast).toHaveBeenCalledWith(
                    expect.objectContaining({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudo eliminar el cliente'
                    })
                );
            });

            expect(
                within(dialog).getByText('Cliente Mostrador')
            ).toBeInTheDocument();
        });

        it('no intenta eliminar un cliente sin ID', async () => {
            jest.mocked(ClientService.getAll).mockResolvedValueOnce([
                {
                    ...mockClients[0],
                    id: null
                }
            ] as any);

            render(<ListClientsPage />);

            const row = await getClientRow('Cliente Mostrador');
            await waitForActionButtons(row, 4);

            fireEvent.click(
                within(row).getByRole('button', { name: 'Eliminar' })
            );

            fireEvent.click(
                screen.getByRole('button', { name: 'Sí' })
            );

            expect(ClientService.delete).not.toHaveBeenCalled();
        });
    });

    describe('Permisos de usuario', () => {
        it('muestra cuatro acciones para un administrador', async () => {
            localStorage.setItem(
                'user',
                JSON.stringify({ idUsuario: 1, rol: 'ADMIN' })
            );

            render(<ListClientsPage />);

            const row = await getClientRow('Cliente Mostrador');

            await waitForActionButtons(row, 4);

            expect(
                within(row).getByRole('button', {
                    name: 'Validar y solicitar crédito'
                })
            ).toBeInTheDocument();

            expect(
                within(row).getByRole('button', { name: 'Última compra' })
            ).toBeInTheDocument();

            expect(
                within(row).getByRole('button', { name: 'Editar' })
            ).toBeInTheDocument();

            expect(
                within(row).getByRole('button', { name: 'Eliminar' })
            ).toBeInTheDocument();
        });

        it('no muestra la opción de solicitar crédito a un empleado', async () => {
            localStorage.setItem(
                'user',
                JSON.stringify({ idUsuario: 2, rol: 'EMPLEADO' })
            );

            render(<ListClientsPage />);

            const row = await getClientRow('Cliente Mostrador');

            await waitForActionButtons(row, 3);

            expect(
                within(row).queryByRole('button', {
                    name: 'Validar y solicitar crédito'
                })
            ).not.toBeInTheDocument();

            expect(
                within(row).getByRole('button', { name: 'Última compra' })
            ).toBeInTheDocument();

            expect(
                within(row).getByRole('button', { name: 'Editar' })
            ).toBeInTheDocument();

            expect(
                within(row).getByRole('button', { name: 'Eliminar' })
            ).toBeInTheDocument();
        });

        it('no permite abrir la solicitud de crédito si no es administrador', async () => {
            localStorage.setItem(
                'user',
                JSON.stringify({ idUsuario: 2, rol: 'EMPLEADO' })
            );

            render(<ListClientsPage />);

            await getClientRow('Cliente Mostrador');

            expect(ClientService.getPurchasesCount).not.toHaveBeenCalled();
            expect(
                screen.queryByTestId('credit-dialog')
            ).not.toBeInTheDocument();
        });
    });

    describe('Manejo de errores', () => {
        it('muestra una notificación cuando falla la carga de clientes', async () => {
            jest.mocked(ClientService.getAll).mockRejectedValueOnce(
                new Error('Error de conexión')
            );

            render(<ListClientsPage />);

            await waitFor(() => {
                expect(mockShowToast).toHaveBeenCalledWith(
                    expect.objectContaining({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'No se pudieron cargar los clientes'
                    })
                );
            });
        });

        it('registra el error si falla la carga de catálogos', async () => {
            const consoleError = jest
                .spyOn(console, 'error')
                .mockImplementation(() => { });

            jest.mocked(CatalogService.getRegimenesFiscales)
                .mockRejectedValueOnce(new Error('Error de catálogo'));

            try {
                render(<ListClientsPage />);

                await screen.findByText('Cliente Mostrador');

                await waitFor(() => {
                    expect(consoleError).toHaveBeenCalledWith(
                        'Error cargando catálogos',
                        expect.any(Error)
                    );
                });
            } finally {
                consoleError.mockRestore();
            }
        });

        it('mantiene el mensaje de tabla vacía cuando falla la carga de clientes', async () => {
            jest.mocked(ClientService.getAll).mockRejectedValueOnce(
                new Error('Error de conexión')
            );

            render(<ListClientsPage />);

            expect(
                await screen.findByText('No se encontraron clientes.')
            ).toBeInTheDocument();
        });
    });
});
