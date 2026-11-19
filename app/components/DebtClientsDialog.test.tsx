import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DebtClientsDialog } from './DebtClientsDialog';
import { OrderService } from '@/app/service/orderService';
import { ClientService } from '@/app/service/clientService';

const mockToastShow = jest.fn();

jest.mock('@/app/service/orderService', () => ({
    OrderService: {
        getClientesConSaldoDeudor: jest.fn(),
        registrarPago: jest.fn(),
    },
}));

jest.mock('@/app/service/clientService', () => ({
    ClientService: {
        getAll: jest.fn(),
    },
}));

jest.mock('primereact/toast', () => {
    const React = require('react');
    return {
        Toast: React.forwardRef((_props: any, ref: any) => {
            React.useImperativeHandle(ref, () => ({
                show: mockToastShow,
            }));
            return <div data-testid="toast" />;
        }),
    };
});

jest.mock('primereact/dialog', () => ({
    Dialog: ({ visible, header, children, footer, onHide }: any) =>
        visible ? (
            <section role="dialog" aria-label={typeof header === 'string' ? header : 'Lista de clientes con adeudo'}>
                <div>{header}</div>
                <div>{children}</div>
                {footer && <div>{footer}</div>}
                <button type="button" onClick={onHide}>
                    Cerrar modal
                </button>
            </section>
        ) : null,
}));

jest.mock('primereact/button', () => ({
    Button: ({ label, icon, tooltip, onClick, disabled, loading }: any) => (
        <button
            type="button"
            aria-label={label || tooltip || icon || 'button'}
            title={tooltip}
            onClick={onClick}
            disabled={disabled || loading}
        >
            {label}
        </button>
    ),
}));

jest.mock('primereact/tag', () => ({
    Tag: ({ value, severity }: any) => (
        <span data-testid={`tag-${severity}`}>{value}</span>
    ),
}));

jest.mock('primereact/inputnumber', () => ({
    InputNumber: ({ id, value, onValueChange }: any) => (
        <input
            id={id}
            type="number"
            value={value ?? ''}
            onChange={(event) =>
                onValueChange?.({
                    value: event.target.value === '' ? null : Number(event.target.value),
                })
            }
        />
    ),
}));

jest.mock('primereact/column', () => ({
    Column: () => null,
}));

jest.mock('primereact/datatable', () => {
    const React = require('react');
    return {
        DataTable: ({
            value = [],
            children,
            loading,
            emptyMessage,
            totalRecords,
            onPage,
        }: any) => {
            const columns = React.Children.toArray(children);
            return (
                <div data-testid="datatable">
                    <span data-testid="table-loading">{String(Boolean(loading))}</span>
                    <span data-testid="total-records">{totalRecords}</span>

                    <button
                        type="button"
                        onClick={() => onPage?.({ first: 10, rows: 10, page: 1 })}
                    >
                        Siguiente página
                    </button>

                    <button
                        type="button"
                        onClick={() => onPage?.({ first: 20, rows: 10 })}
                    >
                        Página sin índice explícito
                    </button>

                    {value.length > 0 ? (
                        <table>
                            <tbody>
                                {value.map((row: any, rowIndex: number) => (
                                    <tr key={row.idCliente ?? rowIndex}>
                                        {columns.map((col: any, colIndex: number) => (
                                            <td key={colIndex}>
                                                {col.props.body
                                                    ? col.props.body(row)
                                                    : row[col.props.field]}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>{emptyMessage}</p>
                    )}
                </div>
            );
        },
    };
});

describe('DebtClientsDialog Component', () => {
    const mockGetDebtors = OrderService.getClientesConSaldoDeudor as jest.Mock;
    const mockRegistrarPago = OrderService.registrarPago as jest.Mock;
    const mockGetAllClients = ClientService.getAll as jest.Mock;

    const mockOnHide = jest.fn();
    const mockOnPaymentSuccess = jest.fn();

    const defaultProps = {
        visible: true,
        onHide: mockOnHide,
        currentUserId: 15,
        onPaymentSuccess: mockOnPaymentSuccess,
    };

    const debtorsMock = [
        {
            idCliente: 1,
            cliente: {
                idCliente: 1,
                nombre: 'Imprenta El Sol',
                estatusCredito: 'AL CORRIENTE',
                diasCredito: 30,
            },
            saldoDeudor: 2500.5,
        },
        {
            idCliente: 2,
            cliente: {
                idCliente: 2,
                nombre: 'Papelería Central',
                estatusCredito: 'ATRASADO',
                diasCredito: 15,
            },
            saldoDeudor: 1200,
        },
        {
            idCliente: 3,
            cliente: {
                idCliente: 3,
                nombre: 'Editorial Norte',
                estatusCredito: 'SUSPENDIDO',
                diasCredito: null,
            },
            saldoDeudor: 800,
        },
        {
            idCliente: 4,
            cliente: {
                idCliente: 4,
                nombre: '',
                estatusCredito: undefined,
                diasCredito: 0,
            },
            saldoDeudor: 450,
        },
    ];

    const clientsCatalogMock = [
        {
            id: 1,
            nombre: 'Imprenta El Sol',
            telefono: '2711234567',
            rfc: 'IES010101AAA',
        },
        {
            id: 2,
            nombre: 'Papelería Central',
            telefono: '',
            rfc: 'PCE020202BBB',
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();

        mockGetDebtors.mockResolvedValue({
            content: debtorsMock,
            page: { totalElements: 4 },
        });
        mockGetAllClients.mockResolvedValue(clientsCatalogMock);
        mockRegistrarPago.mockResolvedValue({ idPago: 99 });
    });

    it('no debe renderizar ni consultar servicios cuando visible es false', () => {
        render(<DebtClientsDialog {...defaultProps} visible={false} />);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(mockGetDebtors).not.toHaveBeenCalled();
        expect(mockGetAllClients).not.toHaveBeenCalled();
    });

    it('debe cargar deudores y catálogo de clientes al abrirse y renderizar todas las columnas', async () => {
        render(<DebtClientsDialog {...defaultProps} />);

        expect(
            await screen.findByText('Lista de clientes con adeudo')
        ).toBeInTheDocument();

        await waitFor(() => {
            expect(mockGetDebtors).toHaveBeenCalledWith(0, 10);
            expect(mockGetAllClients).toHaveBeenCalledTimes(1);
        });

        expect(screen.getByText('Imprenta El Sol')).toBeInTheDocument();
        expect(screen.getByText('Tel: 2711234567 | RFC: IES010101AAA')).toBeInTheDocument();
        expect(screen.getByText('30 días')).toBeInTheDocument();
        expect(screen.getByTestId('tag-success')).toHaveTextContent('AL CORRIENTE');

        expect(screen.getByText('Papelería Central')).toBeInTheDocument();
        expect(screen.getByText('| RFC: PCE020202BBB')).toBeInTheDocument();
        expect(screen.getByText('15 días')).toBeInTheDocument();
        expect(screen.getByTestId('tag-danger')).toHaveTextContent('ATRASADO');

        expect(screen.getByText('Editorial Norte')).toBeInTheDocument();
        expect(screen.getByTestId('tag-warning')).toHaveTextContent('SUSPENDIDO');

        expect(screen.getByText('Cliente #4')).toBeInTheDocument();
        expect(screen.getByTestId('tag-info')).toHaveTextContent('CON ADEUDO');
        expect(screen.getAllByText('N/A')).toHaveLength(2);
        expect(screen.getByTestId('total-records')).toHaveTextContent('4');
    });

    it('debe soportar respuestas paginadas con totalElements en la raíz o sin total explícito', async () => {
        mockGetDebtors.mockResolvedValueOnce({
            content: [debtorsMock[0]],
            totalElements: 25,
        });

        const { unmount } = render(<DebtClientsDialog {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByTestId('total-records')).toHaveTextContent('25');
        });

        unmount();

        mockGetDebtors.mockResolvedValueOnce({
            content: [debtorsMock[0], debtorsMock[1]],
        });

        render(<DebtClientsDialog {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByTestId('total-records')).toHaveTextContent('2');
        });
    });

    it('debe manejar la paginación con índice explícito y calculado', async () => {
        render(<DebtClientsDialog {...defaultProps} />);

        await screen.findByText('Imprenta El Sol');

        fireEvent.click(screen.getByRole('button', { name: 'Siguiente página' }));

        await waitFor(() => {
            expect(mockGetDebtors).toHaveBeenLastCalledWith(1, 10);
        });

        fireEvent.click(
            screen.getByRole('button', { name: 'Página sin índice explícito' })
        );

        await waitFor(() => {
            expect(mockGetDebtors).toHaveBeenLastCalledWith(2, 10);
        });
    });

    it('debe mostrar mensaje vacío cuando no existen clientes con saldo deudor', async () => {
        mockGetDebtors.mockResolvedValueOnce({
            content: [],
            totalElements: 0,
        });

        render(<DebtClientsDialog {...defaultProps} />);

        expect(
            await screen.findByText('No hay clientes con saldo deudor pendiente.')
        ).toBeInTheDocument();
    });

    it('debe mostrar Toast de error si falla la carga de deudores', async () => {
        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => { });

        mockGetDebtors.mockRejectedValueOnce(new Error('Fallo de red'));

        render(<DebtClientsDialog {...defaultProps} />);

        await waitFor(() => {
            expect(mockToastShow).toHaveBeenCalledWith({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudieron cargar los clientes con saldo deudor.',
            });
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error cargando saldos deudores:',
            expect.any(Error)
        );
        consoleErrorSpy.mockRestore();
    });

    it('debe continuar operando si falla ClientService.getAll', async () => {
        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => { });

        mockGetAllClients.mockRejectedValueOnce(new Error('Error catálogo'));

        render(<DebtClientsDialog {...defaultProps} />);

        expect(await screen.findByText('Imprenta El Sol')).toBeInTheDocument();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error cargando clientes:',
            expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
    });

    describe('Sub-modal de Abono Directo a Cuenta', () => {
        it('debe abrir el sub-modal con el saldo total precargado y permitir cancelarlo', async () => {
            render(<DebtClientsDialog {...defaultProps} />);

            await screen.findByText('Imprenta El Sol');

            const abonarButtons = screen.getAllByRole('button', { name: 'Abonar' });
            fireEvent.click(abonarButtons[0]);

            const subDialog = await screen.findByRole('dialog', {
                name: 'Abono a cuenta: Imprenta El Sol',
            });

            expect(within(subDialog).getByText('$2500.50')).toBeInTheDocument();

            const montoInput = within(subDialog).getByLabelText(
                'Monto a abonar'
            ) as HTMLInputElement;
            expect(montoInput.value).toBe('2500.5');

            fireEvent.click(within(subDialog).getByRole('button', { name: 'Cancelar' }));

            await waitFor(() => {
                expect(
                    screen.queryByRole('dialog', {
                        name: 'Abono a cuenta: Imprenta El Sol',
                    })
                ).not.toBeInTheDocument();
            });
        });

        it('debe deshabilitar Confirmar Abono cuando el monto es 0, negativo o excede el saldo deudor', async () => {
            render(<DebtClientsDialog {...defaultProps} />);

            await screen.findByText('Imprenta El Sol');

            fireEvent.click(screen.getAllByRole('button', { name: 'Abonar' })[0]);

            const subDialog = await screen.findByRole('dialog', {
                name: 'Abono a cuenta: Imprenta El Sol',
            });
            const montoInput = within(subDialog).getByLabelText('Monto a abonar');
            const confirmBtn = within(subDialog).getByRole('button', {
                name: 'Confirmar Abono',
            });

            expect(confirmBtn).not.toBeDisabled();

            fireEvent.change(montoInput, { target: { value: '' } });
            expect(confirmBtn).toBeDisabled();

            fireEvent.change(montoInput, { target: { value: '3000' } });
            expect(confirmBtn).toBeDisabled();
        });

        it('debe registrar un abono con referencia personalizada, recargar la lista y ejecutar onPaymentSuccess', async () => {
            render(<DebtClientsDialog {...defaultProps} />);

            await screen.findByText('Imprenta El Sol');

            fireEvent.click(screen.getAllByRole('button', { name: 'Abonar' })[0]);

            const subDialog = await screen.findByRole('dialog', {
                name: 'Abono a cuenta: Imprenta El Sol',
            });

            fireEvent.change(within(subDialog).getByLabelText('Monto a abonar'), {
                target: { value: '1000' },
            });
            fireEvent.change(
                within(subDialog).getByLabelText('Referencia / Método de pago'),
                { target: { value: '  SPEI-9988  ' } }
            );

            fireEvent.click(
                within(subDialog).getByRole('button', { name: 'Confirmar Abono' })
            );

            await waitFor(() => {
                expect(mockRegistrarPago).toHaveBeenCalledWith(null, {
                    idCliente: 1,
                    monto: 1000,
                    referencia: 'Abono a cuenta - SPEI-9988',
                    idUsuario: 15,
                });
            });

            expect(mockToastShow).toHaveBeenCalledWith({
                severity: 'success',
                summary: 'Abono Registrado',
                detail: 'Se registró el abono de $1000.00 a la cuenta de Imprenta El Sol.',
            });

            expect(mockGetDebtors).toHaveBeenCalledTimes(2);
            expect(mockOnPaymentSuccess).toHaveBeenCalledTimes(1);

            await waitFor(() => {
                expect(
                    screen.queryByRole('dialog', {
                        name: 'Abono a cuenta: Imprenta El Sol',
                    })
                ).not.toBeInTheDocument();
            });
        });

        it('debe usar "Abono directo a cuenta" cuando la referencia se deja vacía y funcionar sin onPaymentSuccess', async () => {
            render(
                <DebtClientsDialog
                    visible={true}
                    onHide={mockOnHide}
                    currentUserId={20}
                />
            );

            await screen.findByText('Papelería Central');

            fireEvent.click(screen.getAllByRole('button', { name: 'Abonar' })[1]);

            const subDialog = await screen.findByRole('dialog', {
                name: 'Abono a cuenta: Papelería Central',
            });

            fireEvent.click(
                within(subDialog).getByRole('button', { name: 'Confirmar Abono' })
            );

            await waitFor(() => {
                expect(mockRegistrarPago).toHaveBeenCalledWith(null, {
                    idCliente: 2,
                    monto: 1200,
                    referencia: 'Abono directo a cuenta',
                    idUsuario: 20,
                });
            });
        });

        it('debe mostrar Toast de error cuando falla registrarPago', async () => {
            mockRegistrarPago.mockRejectedValueOnce(
                new Error('Saldo inconsistente en servidor')
            );

            render(<DebtClientsDialog {...defaultProps} />);

            await screen.findByText('Imprenta El Sol');

            fireEvent.click(screen.getAllByRole('button', { name: 'Abonar' })[0]);

            const subDialog = await screen.findByRole('dialog', {
                name: 'Abono a cuenta: Imprenta El Sol',
            });

            fireEvent.click(
                within(subDialog).getByRole('button', { name: 'Confirmar Abono' })
            );

            await waitFor(() => {
                expect(mockToastShow).toHaveBeenCalledWith({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Saldo inconsistente en servidor',
                });
            });

            mockRegistrarPago.mockRejectedValueOnce({});
            fireEvent.click(
                within(subDialog).getByRole('button', { name: 'Confirmar Abono' })
            );

            await waitFor(() => {
                expect(mockToastShow).toHaveBeenCalledWith({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo registrar el abono.',
                });
            });
        });
    });
});