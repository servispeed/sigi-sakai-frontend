import React from 'react';
import {
    render,
    screen,
    waitFor,
    within
} from '@testing-library/react';
import WorkshopListPage from '@/app/(main)/workshoplist/page';
import { OrderService } from '@/app/service/orderService';
import { ClientService } from '@/app/service/clientService';

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

        return (
            <a href={href} {...props}>
                {children}
            </a>
        );
    };
});

jest.mock('primereact/card', () => ({
    Card: ({ children }: any) => <section>{children}</section>
}));

jest.mock('primereact/button', () => ({
    Button: ({ icon, tooltip, disabled, onClick }: any) => (
        <button
            type="button"
            title={tooltip}
            disabled={disabled}
            onClick={onClick}
        >
            {icon}
        </button>
    )
}));

jest.mock('primereact/toast', () => {
    const React = require('react');

    return {
        Toast: React.forwardRef((_props: any, ref: any) => {
            React.useImperativeHandle(ref, () => ({
                show: mockToastShow
            }));

            return <div data-testid="toast" />;
        })
    };
});

jest.mock('primereact/column', () => ({
    Column: () => null
}));

jest.mock('primereact/datatable', () => {
    const React = require('react');

    return {
        DataTable: ({ value, children, emptyMessage }: any) => {
            const columns = React.Children.toArray(children) as any[];

            if (!value?.length) {
                return <div>{emptyMessage}</div>;
            }

            return (
                <table>
                    <thead>
                        <tr>
                            {columns.map((column: any, index: number) => (
                                <th key={index}>{column.props.header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {value.map((row: any, rowIndex: number) => (
                            <tr key={rowIndex}>
                                {columns.map((column: any, columnIndex: number) => (
                                    <td key={columnIndex}>
                                        {column.props.body
                                            ? column.props.body(row)
                                            : row[column.props.field]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
        }
    };
});

const mockToastShow = jest.fn();

jest.mock('@/app/service/orderService', () => ({
    OrderService: {
        getOrdenesActivas: jest.fn()
    }
}));

jest.mock('@/app/service/clientService', () => ({
    ClientService: {
        getAll: jest.fn()
    }
}));

const mockOrders = [
    {
        idOrden: 101,
        idCliente: 1,
        idEstatusActual: 2,
        montoTotal: 1500,
        insumosVerificados: false,
        rutaArchivo: 'Pendiente',
        fechaEntregaFormal: '2026-11-20'
    },
    {
        idOrden: 102,
        idCliente: 2,
        idEstatusActual: 9,
        montoTotal: 2500,
        insumosVerificados: true,
        rutaArchivo: 'ordenes/diseno-102.pdf',
        fechaEntregaFormal: '2026-11-22'
    },
    {
        idOrden: 103,
        idCliente: 1,
        idEstatusActual: 7,
        montoTotal: 3000,
        insumosVerificados: false,
        rutaArchivo: 'ordenes/diseno-103.pdf',
        fechaEntregaFormal: '2026-11-25'
    },
    {
        idOrden: 104,
        idCliente: 3,
        idEstatusActual: 9,
        montoTotal: 1800,
        insumosVerificados: true,
        rutaArchivo: 'Pendiente',
        fechaEntregaFormal: '2026-11-26'
    },
    {
        idOrden: 105,
        idCliente: 2,
        idEstatusActual: 5,
        montoTotal: 4000,
        insumosVerificados: true,
        rutaArchivo: 'ordenes/diseno-105.pdf',
        fechaEntregaFormal: '2026-11-28'
    },
    {
        idOrden: 106,
        idCliente: 3,
        idEstatusActual: 12,
        montoTotal: 1000,
        insumosVerificados: true,
        rutaArchivo: 'ordenes/diseno-106.pdf'
    }
];

const mockClients = [
    { id: 1, nombre: 'Cliente Uno' },
    { id: 2, nombre: 'Empresa Dos' },
    { id: 3, nombre: 'Cliente Tres' }
];

const waitForInitialLoad = async () => {
    await waitFor(() => {
        expect(OrderService.getOrdenesActivas).toHaveBeenCalledWith(0, 100);
        expect(ClientService.getAll).toHaveBeenCalled();
    });

    expect(await screen.findByText('Bienvenido, Jefe de taller')).toBeInTheDocument();
};

describe('WorkshopListPage - Pruebas de integración', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (OrderService.getOrdenesActivas as jest.Mock).mockResolvedValue({
            content: mockOrders
        });

        (ClientService.getAll as jest.Mock).mockResolvedValue(mockClients);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('debe cargar y mostrar las órdenes activas del taller', async () => {
        render(<WorkshopListPage />);

        await waitForInitialLoad();

        expect(screen.getByText('101')).toBeInTheDocument();
        expect(screen.getByText('102')).toBeInTheDocument();
        expect(screen.getByText('103')).toBeInTheDocument();
        expect(screen.getByText('104')).toBeInTheDocument();
        expect(screen.getByText('105')).toBeInTheDocument();
        expect(screen.queryByText('106')).not.toBeInTheDocument();
    });

    it('debe consultar las órdenes y los clientes al iniciar', async () => {
        render(<WorkshopListPage />);

        await waitForInitialLoad();

        expect(OrderService.getOrdenesActivas).toHaveBeenCalledTimes(1);
        expect(ClientService.getAll).toHaveBeenCalledTimes(1);
    });

    it('debe mostrar el nombre del cliente asociado a cada orden', async () => {
        render(<WorkshopListPage />);

        await waitForInitialLoad();

        expect(screen.getAllByText('Cliente Uno')).toHaveLength(2);
        expect(screen.getAllByText('Empresa Dos')).toHaveLength(2);
        expect(screen.getByText('Cliente Tres')).toBeInTheDocument();
    });

    it('debe mostrar un nombre alternativo cuando no encuentra al cliente', async () => {
        (ClientService.getAll as jest.Mock).mockResolvedValue([]);

        render(<WorkshopListPage />);

        await waitForInitialLoad();

        expect(screen.getAllByText('Cliente #1')).toHaveLength(2);
        expect(screen.getAllByText('Cliente #2')).toHaveLength(2);
        expect(screen.getByText('Cliente #3')).toBeInTheDocument();
    });

    it('debe clasificar correctamente los estados de los insumos', async () => {
        render(<WorkshopListPage />);

        await waitForInitialLoad();

        expect(screen.getByTitle('Pendiente de revisión')).toBeInTheDocument();
        expect(
            screen.getAllByTitle('Insumos verificados y listos')
        ).toHaveLength(3);
        expect(screen.getByTitle('Faltan insumos en espera de compras')).toBeInTheDocument();
    });

    it('debe permitir acceder a la revisión de insumos de una orden pendiente', async () => {
        render(<WorkshopListPage />);

        await waitForInitialLoad();

        const suppliesLink = screen.getByTitle('Pendiente de revisión');

        expect(suppliesLink.closest('a')).toHaveAttribute(
            'href',
            '/workshopsupplies?id=101'
        );
    });

    it('no debe mostrar un enlace de revisión para órdenes con insumos confirmados', async () => {
        render(<WorkshopListPage />);

        await waitForInitialLoad();

        const confirmedElement = screen.getAllByTitle('Insumos verificados y listos')[0];

        expect(confirmedElement.closest('a')).toBeNull();
    });

    it('debe permitir imprimir una orden aprobada con archivo e insumos verificados', async () => {
        render(<WorkshopListPage />);

        await waitForInitialLoad();

        const row = screen.getByRole('row', { name: /102/ });
        const printLink = within(row).getByTitle('Enviar a impresión');

        expect(printLink.closest('a')).toHaveAttribute(
            'href',
            '/workshopprint?id=102'
        );
    });

    it('debe permitir imprimir una orden con estatus 5 cuando cumple los requisitos', async () => {
        render(<WorkshopListPage />);

        await waitForInitialLoad();

        const row = screen.getByRole('row', { name: /105/ });
        const printLink = within(row).getByTitle('Enviar a impresión');

        expect(printLink.closest('a')).toHaveAttribute(
            'href',
            '/workshopprint?id=105'
        );
    });

    it('debe bloquear la impresión cuando falta el archivo de diseño', async () => {
        render(<WorkshopListPage />);

        await waitForInitialLoad();

        const row = screen.getByRole('row', { name: /104/ });
        const printButton = within(row).getByTitle('Falta archivo de diseño');

        expect(printButton).toBeDisabled();
    });

    it('debe bloquear la impresión cuando faltan insumos', async () => {
        render(<WorkshopListPage />);

        await waitForInitialLoad();

        const row = screen.getByRole('row', { name: /103/ });
        const printButton = within(row).getByTitle('Faltan insumos');

        expect(printButton).toBeDisabled();
    });

    it('debe mostrar el aviso de diseño no aprobado cuando no cumple el estatus requerido', async () => {
        (OrderService.getOrdenesActivas as jest.Mock).mockResolvedValue({
            content: [
                {
                    ...mockOrders[2],
                    idEstatusActual: 7,
                    insumosVerificados: true,
                    rutaArchivo: 'ordenes/diseno-103.pdf'
                }
            ]
        });

        render(<WorkshopListPage />);

        await waitForInitialLoad();

        expect(
            screen.getByTitle('Diseño no aprobado por cliente aún')
        ).toBeDisabled();
    });

    it('debe mostrar un mensaje cuando no existen órdenes activas', async () => {
        (OrderService.getOrdenesActivas as jest.Mock).mockResolvedValue({
            content: []
        });

        render(<WorkshopListPage />);

        expect(
            await screen.findByText('No hay órdenes pendientes en taller.')
        ).toBeInTheDocument();
    });

    it('debe mostrar un mensaje cuando todas las órdenes están finalizadas', async () => {
        (OrderService.getOrdenesActivas as jest.Mock).mockResolvedValue({
            content: [
                {
                    ...mockOrders[5],
                    idEstatusActual: 12
                }
            ]
        });

        render(<WorkshopListPage />);

        expect(
            await screen.findByText('No hay órdenes pendientes en taller.')
        ).toBeInTheDocument();
    });

    it('debe mostrar un error cuando falla la carga de las órdenes', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        (OrderService.getOrdenesActivas as jest.Mock).mockRejectedValue(
            new Error('Error al obtener órdenes')
        );

        render(<WorkshopListPage />);

        await waitFor(() => {
            expect(mockToastShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'No se pudo cargar la lista de trabajo.'
                })
            );
        });

        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('debe mostrar un error cuando falla la carga de los clientes', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        (ClientService.getAll as jest.Mock).mockRejectedValue(
            new Error('Error al obtener clientes')
        );

        render(<WorkshopListPage />);

        await waitFor(() => {
            expect(mockToastShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'error',
                    detail: 'No se pudo cargar la lista de trabajo.'
                })
            );
        });

        expect(consoleErrorSpy).toHaveBeenCalled();
    });
});