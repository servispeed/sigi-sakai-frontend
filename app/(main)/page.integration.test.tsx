
import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import Dashboard from './page';

import { OrderService } from '@/app/service/orderService';
import { UserService } from '@/app/service/userService';
import { ClientService } from '@/app/service/clientService';
import { DashboardService } from '../service/dashboardService';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockShow = jest.fn();

const mockRouter = {
    replace: mockReplace,
    push: mockPush
};

jest.mock('next/navigation', () => ({
    useRouter: () => mockRouter
}));

jest.mock('next/link', () => {
    return function MockLink({
        href,
        children,
        legacyBehavior,
        passHref,
        ...props
    }: {
        href: string;
        children: React.ReactNode;
        legacyBehavior?: boolean;
        passHref?: boolean;
        [key: string]: unknown;
    }) {
        if (legacyBehavior) {
            return React.cloneElement(children as React.ReactElement, {
                href,
                ...props
            });
        }

        return <a href={href} {...props}>{children}</a>;
    };
});

jest.mock('../../layout/context/layoutcontext', () => {
    const React = require('react');

    return {
        LayoutContext: React.createContext({
            layoutConfig: { colorScheme: 'light' }
        })
    };
});

jest.mock('@/app/service/orderService', () => ({
    OrderService: {
        getEstatusOperaciones: jest.fn(),
        getRazonesCancelacion: jest.fn(),
        getOrdenesActivas: jest.fn(),
        cancelarOrden: jest.fn(),
        avanzarEstatus: jest.fn()
    }
}));

jest.mock('@/app/service/userService', () => ({
    UserService: {
        getDesigners: jest.fn()
    }
}));

jest.mock('@/app/service/clientService', () => ({
    ClientService: {
        getAll: jest.fn()
    }
}));

jest.mock('../service/dashboardService', () => ({
    DashboardService: {
        getCotizacionesGrafica: jest.fn(),
        getOrdenesGrafica: jest.fn(),
        getEgresosGrafica: jest.fn(),
        getIngresosGrafica: jest.fn()
    }
}));

jest.mock('primereact/toast', () => {
    const React = require('react');

    return {
        Toast: React.forwardRef((_props: any, ref: any) => {
            React.useImperativeHandle(ref, () => ({
                show: mockShow
            }));

            return <div data-testid="toast" />;
        })
    };
});

jest.mock('primereact/button', () => ({
    Button: ({
        label,
        icon,
        onClick,
        disabled,
        loading,
        tooltip,
        children
    }: any) => (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            title={tooltip}
        >
            {label || icon || children}
        </button>
    )
}));

jest.mock('primereact/chart', () => ({
    Chart: ({ type }: any) => (
        <div data-testid={`chart-${type}`} />
    )
}));

jest.mock('primereact/column', () => ({
    Column: () => null
}));

jest.mock('primereact/tag', () => ({
    Tag: ({ value }: any) => <span>{value}</span>
}));

jest.mock('primereact/dropdown', () => ({
    Dropdown: ({
        value,
        options,
        onChange,
        optionLabel,
        optionValue,
        placeholder,
        id
    }: any) => (
        <select
            id={id}
            aria-label={id || placeholder || 'Seleccionar'}
            value={value ?? ''}
            onChange={(event) => {
                const selected = options.find(
                    (option: any) =>
                        String(option[optionValue || 'value']) === event.target.value
                );

                onChange({
                    value: selected
                        ? selected[optionValue || 'value']
                        : null
                });
            }}
        >
            <option value="">{placeholder || 'Seleccionar'}</option>
            {options.map((option: any) => (
                <option
                    key={option[optionValue || 'value']}
                    value={option[optionValue || 'value']}
                >
                    {option[optionLabel || 'label']}
                </option>
            ))}
        </select>
    )
}));

jest.mock('primereact/dialog', () => ({
    Dialog: ({ visible, header, children, footer }: any) => (
        visible ? (
            <div role="dialog">
                <div>{header}</div>
                {children}
                <div>{footer}</div>
            </div>
        ) : null
    )
}));

jest.mock('primereact/treetable', () => ({
    TreeTable: ({ value, children, loading, emptyMessage, onPage }: any) => {
        const columns = React.Children.toArray(children) as React.ReactElement[];

        if (loading) {
            return <div data-testid="orders-loading">Cargando órdenes</div>;
        }

        if (!value || value.length === 0) {
            return <div>{emptyMessage}</div>;
        }

        const renderNode = (node: any) => (
            <div key={node.key} data-testid={node.data.isGroup ? 'order-group' : 'order-row'}>
                {columns.map((column, index) => {
                    const { field, body } = column.props;

                    if (body) {
                        return (
                            <div key={index}>
                                {body(node)}
                            </div>
                        );
                    }

                    return (
                        <div key={index}>
                            {field ? node.data[field] : null}
                        </div>
                    );
                })}
            </div>
        );

        return (
            <div data-testid="orders-table">
                {value.map((node: any) => (
                    <React.Fragment key={node.key}>
                        {renderNode(node)}
                        {node.children?.map(renderNode)}
                    </React.Fragment>
                ))}
                <button
                    onClick={() => onPage?.({ first: 5, rows: 5 })}
                >
                    Página siguiente
                </button>
            </div>
        );
    }
}));

const mockDesigners = [
    { idUsuario: 10, nombre: 'Diseñador Uno' },
    { idUsuario: 20, nombre: 'Diseñador Dos' }
];

const mockClients = [
    { id: 1, nombre: 'Empresa Uno' },
    { id: 2, nombre: 'Empresa Dos' }
];

const mockStatuses = [
    { idEstatus: 1, descripcion: 'Cotización iniciada' },
    { idEstatus: 5, descripcion: 'En impresión' },
    { idEstatus: 6, descripcion: 'Orden lista' },
    { idEstatus: 12, descripcion: 'Entregada' }
];

const mockReasons = [
    { idRazon: 1, descripcion: 'Cancelación del cliente' },
    { idRazon: 2, descripcion: 'Error en la cotización' }
];

const mockOrders = [
    {
        idOrden: 101,
        idUsuarioDisenador: 10,
        idCliente: 1,
        fechaCreacion: '2026-11-10',
        montoTotal: 1500,
        montoPagado: 1000,
        idEstatusActual: 5
    },
    {
        idOrden: 102,
        idUsuarioDisenador: 10,
        idCliente: 2,
        fechaCreacion: '2026-11-11',
        montoTotal: 2000,
        montoPagado: 2000,
        idEstatusActual: 6
    },
    {
        idOrden: 103,
        idUsuarioDisenador: null,
        idCliente: null,
        fechaCreacion: '2026-11-12',
        montoTotal: 500,
        montoPagado: 500,
        idEstatusActual: 1
    }
];

const mockGraphData = {
    cotizaciones: [
        { label: 'Noviembre', totalCotizaciones: 8 }
    ],
    ordenes: [
        { label: 'Noviembre', totalOrdenes: 5 }
    ],
    egresos: {
        datosGrafica: [
            { label: 'Noviembre', total: 3000 }
        ]
    },
    ingresos: {
        datosGrafica: [
            { label: 'Noviembre', value: 6000 }
        ],
        montoPagado: 6000
    }
};

const waitForDashboard = async () => {
    await screen.findByText('Resumen operativo');
    await screen.findByText('Diseñador Uno');
    await screen.findByText('Orden #101');
};

describe('Dashboard - Pruebas de integración', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        localStorage.setItem('token', 'token-prueba');
        localStorage.setItem(
            'user',
            JSON.stringify({ idUsuario: 7, token: 'token-prueba' })
        );

        (UserService.getDesigners as jest.Mock).mockResolvedValue(mockDesigners);
        (ClientService.getAll as jest.Mock).mockResolvedValue(mockClients);

        (OrderService.getEstatusOperaciones as jest.Mock).mockResolvedValue(mockStatuses);
        (OrderService.getRazonesCancelacion as jest.Mock).mockResolvedValue(mockReasons);
        (OrderService.getOrdenesActivas as jest.Mock).mockResolvedValue({
            content: mockOrders,
            page: { totalElements: 3 }
        });

        (OrderService.cancelarOrden as jest.Mock).mockResolvedValue({});
        (OrderService.avanzarEstatus as jest.Mock).mockResolvedValue({});

        (DashboardService.getCotizacionesGrafica as jest.Mock).mockResolvedValue(
            mockGraphData.cotizaciones
        );
        (DashboardService.getOrdenesGrafica as jest.Mock).mockResolvedValue(
            mockGraphData.ordenes
        );
        (DashboardService.getEgresosGrafica as jest.Mock).mockResolvedValue(
            mockGraphData.egresos
        );
        (DashboardService.getIngresosGrafica as jest.Mock).mockResolvedValue(
            mockGraphData.ingresos
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
        localStorage.clear();
    });

    it('debe redirigir al inicio de sesión cuando no existe token', async () => {
        localStorage.clear();

        render(<Dashboard />);

        await waitFor(() => {
            expect(mockReplace).toHaveBeenCalledWith('/auth/login');
        });

        expect(mockReplace).toHaveBeenCalledWith('/auth/login');
    });

    it('debe permitir el acceso cuando existe un token en localStorage', async () => {
        render(<Dashboard />);

        await waitForDashboard();

        expect(screen.getByText('Resumen operativo')).toBeInTheDocument();
        expect(mockReplace).not.toHaveBeenCalled();
    });

    it('debe obtener el token desde los datos del usuario cuando no existe token independiente', async () => {
        localStorage.removeItem('token');

        render(<Dashboard />);

        await waitForDashboard();

        expect(mockReplace).not.toHaveBeenCalled();
        expect(screen.getByText('Resumen operativo')).toBeInTheDocument();
    });

    it('debe cargar las gráficas y los indicadores financieros', async () => {
        render(<Dashboard />);

        await waitForDashboard();

        await waitFor(() => {
            expect(DashboardService.getCotizacionesGrafica).toHaveBeenCalledWith('semana');
            expect(DashboardService.getOrdenesGrafica).toHaveBeenCalledWith('semana');
            expect(DashboardService.getEgresosGrafica).toHaveBeenCalledWith('semana');
            expect(DashboardService.getIngresosGrafica).toHaveBeenCalledWith('semana');
        });

        expect(screen.getByText('$6,000.00')).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();

        expect(screen.getByTestId('chart-bar')).toBeInTheDocument();
        expect(screen.getByTestId('chart-line')).toBeInTheDocument();
    });

    it('debe actualizar las gráficas al cambiar el período', async () => {
        render(<Dashboard />);

        await waitForDashboard();

        fireEvent.change(screen.getByLabelText('Seleccionar'), {
            target: { value: 'mes' }
        });

        await waitFor(() => {
            expect(DashboardService.getCotizacionesGrafica).toHaveBeenCalledWith('mes');
            expect(DashboardService.getOrdenesGrafica).toHaveBeenCalledWith('mes');
            expect(DashboardService.getEgresosGrafica).toHaveBeenCalledWith('mes');
            expect(DashboardService.getIngresosGrafica).toHaveBeenCalledWith('mes');
        });
    });

    it('debe mostrar las órdenes agrupadas por diseñador', async () => {
        render(<Dashboard />);

        await waitForDashboard();

        expect(screen.getByText('Diseñador Uno')).toBeInTheDocument();
        expect(screen.getByText('Sin Asignar / Mostrador')).toBeInTheDocument();

        expect(screen.getByText('2 órdenes')).toBeInTheDocument();
        expect(screen.getByText('1 órdenes')).toBeInTheDocument();
    });

    it('debe mostrar los clientes y los datos de las órdenes', async () => {
        render(<Dashboard />);

        await waitForDashboard();

        expect(screen.getByText('Empresa Uno')).toBeInTheDocument();
        expect(screen.getByText('Empresa Dos')).toBeInTheDocument();
        expect(screen.getByText('Público General')).toBeInTheDocument();

        expect(screen.getByText('Resta: $500.00')).toBeInTheDocument();
        expect(screen.getByText('En impresión')).toBeInTheDocument();
        expect(screen.getByText('Orden lista')).toBeInTheDocument();
    });

    it('debe utilizar el nombre alternativo del cliente cuando está incluido en la orden', async () => {
        (OrderService.getOrdenesActivas as jest.Mock).mockResolvedValue({
            content: [
                {
                    ...mockOrders[0],
                    clienteNombre: 'Cliente directo'
                }
            ],
            totalElements: 1
        });

        render(<Dashboard />);

        await screen.findByText('Cliente directo');

        expect(screen.queryByText('Empresa Uno')).not.toBeInTheDocument();
    });

    it('debe mostrar el identificador del diseñador cuando no existe en el catálogo', async () => {
        (OrderService.getOrdenesActivas as jest.Mock).mockResolvedValue({
            content: [
                {
                    ...mockOrders[0],
                    idUsuarioDisenador: 99
                }
            ],
            totalElements: 1
        });

        render(<Dashboard />);

        expect(
            await screen.findByText('Diseñador ID: 99')
        ).toBeInTheDocument();
    });

    it('debe solicitar la siguiente página de órdenes', async () => {
        render(<Dashboard />);

        await waitForDashboard();

        fireEvent.click(screen.getByText('Página siguiente'));

        await waitFor(() => {
            expect(OrderService.getOrdenesActivas).toHaveBeenLastCalledWith(1, 5);
        });
    });

    it('debe abrir el diálogo de cancelación de una orden', async () => {
        render(<Dashboard />);

        await waitForDashboard();

        const orderRow = screen.getAllByTestId('order-row')[0];
        fireEvent.click(within(orderRow).getByTitle('Cancelar'));

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Confirmar Cancelación')).toBeInTheDocument();
        expect(screen.getByText('Acción irreversible')).toBeInTheDocument();
    });

    it('debe impedir la cancelación cuando no se selecciona una razón', async () => {
        render(<Dashboard />);

        await waitForDashboard();

        fireEvent.click(screen.getAllByTitle('Cancelar')[0]);

        const confirmButton = screen.getByRole('button', {
            name: /confirmar cancelación/i
        });

        expect(confirmButton).toBeDisabled();
        expect(OrderService.cancelarOrden).not.toHaveBeenCalled();
        expect(mockShow).not.toHaveBeenCalled();
    });

    it('debe cancelar una orden cuando se selecciona una razón válida', async () => {
        render(<Dashboard />);

        await waitForDashboard();

        const orderRow = screen.getAllByTestId('order-row')[0];
        fireEvent.click(within(orderRow).getByTitle('Cancelar'));

        fireEvent.change(screen.getByLabelText('razon'), {
            target: { value: '1' }
        });

        fireEvent.click(screen.getByText('Confirmar cancelación'));

        await waitFor(() => {
            expect(OrderService.cancelarOrden).toHaveBeenCalledWith(101, 1, 7);
        });

        expect(mockShow).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'success',
                summary: 'Orden Cancelada'
            })
        );

        await waitFor(() => {
            expect(OrderService.getOrdenesActivas).toHaveBeenCalledTimes(2);
        });
    });

    it('debe mostrar un error cuando falla la cancelación', async () => {
        (OrderService.cancelarOrden as jest.Mock).mockRejectedValue(
            new Error('No se pudo cancelar')
        );

        render(<Dashboard />);

        await waitForDashboard();

        const orderRow = screen.getAllByTestId('order-row')[0];
        fireEvent.click(within(orderRow).getByTitle('Cancelar'));

        fireEvent.change(screen.getByLabelText('razon'), {
            target: { value: '1' }
        });

        fireEvent.click(screen.getByText('Confirmar cancelación'));

        await waitFor(() => {
            expect(mockShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'error',
                    detail: 'No se pudo cancelar'
                })
            );
        });
    });

    it('debe abrir el diálogo de entrega para una orden lista', async () => {
        render(<Dashboard />);

        await waitForDashboard();

        const orderRow = screen.getAllByTestId('order-row')[1];
        fireEvent.click(within(orderRow).getByTitle('Entregar'));

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Confirmar Entrega')).toBeInTheDocument();
        expect(screen.getByText(/¿Confirmas que el cliente ha recibido/)).toBeInTheDocument();
    });

    it('debe entregar una orden sin adeudo', async () => {
        render(<Dashboard />);

        await waitForDashboard();

        const orderRow = screen.getAllByTestId('order-row')[1];
        fireEvent.click(within(orderRow).getByTitle('Entregar'));

        fireEvent.click(screen.getByText('Entregar Orden'));

        await waitFor(() => {
            expect(OrderService.avanzarEstatus).toHaveBeenCalledWith(
                102,
                {
                    idUsuario: 7,
                    idEstatusDestino: 12,
                    clienteAprobo: true
                }
            );
        });

        expect(mockShow).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'success',
                summary: 'Entregada'
            })
        );
    });

    it('debe mostrar un error cuando falla la entrega', async () => {
        (OrderService.avanzarEstatus as jest.Mock).mockRejectedValue(
            new Error('Error de entrega')
        );

        render(<Dashboard />);

        await waitForDashboard();

        const orderRow = screen.getAllByTestId('order-row')[1];
        fireEvent.click(within(orderRow).getByTitle('Entregar'));

        fireEvent.click(screen.getByText('Entregar Orden'));

        await waitFor(() => {
            expect(mockShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'error',
                    detail: 'No se pudo registrar la entrega.'
                })
            );
        });
    });

    it('debe navegar a finanzas al seleccionar la gráfica de costos operativos', async () => {
        render(<Dashboard />);

        await waitForDashboard();

        fireEvent.click(screen.getByText('Costos operativos'));

        expect(mockPush).toHaveBeenCalledWith('/finance');
    });

    it('debe mostrar el estado vacío cuando no existen órdenes activas', async () => {
        (OrderService.getOrdenesActivas as jest.Mock).mockResolvedValue({
            content: [],
            totalElements: 0
        });

        render(<Dashboard />);

        expect(
            await screen.findByText('No hay órdenes activas.')
        ).toBeInTheDocument();
    });
});
