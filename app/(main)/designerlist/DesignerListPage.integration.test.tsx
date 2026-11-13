
import React from 'react';
import {
    render,
    screen,
    waitFor,
    within,
    fireEvent
} from '@testing-library/react';
import DesignerListPage from '@/app/(main)/designerlist/page';
import { OrderService } from '@/app/service/orderService';
import { ClientService } from '@/app/service/clientService';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush
    })
}));

jest.mock('@/app/service/orderService', () => ({
    OrderService: {
        getOrdenesPorDisenador: jest.fn(),
        getEstatusOperaciones: jest.fn()
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
        idEstatusActual: 7,
        fechaCreacion: '2026-11-10T10:00:00',
        montoTotal: 1500
    },
    {
        idOrden: 102,
        idCliente: 2,
        idEstatusActual: 10,
        fechaCreacion: '2026-11-12T10:00:00',
        montoTotal: 2500
    },
    {
        idOrden: 103,
        idCliente: 1,
        idEstatusActual: 7,
        fechaCreacion: '2026-11-08T10:00:00',
        montoTotal: 3000
    }
];

const mockClients = [
    {
        id: 1,
        nombre: 'Cliente Uno'
    },
    {
        id: 2,
        nombre: 'Empresa Dos'
    }
];

const mockStatuses = [
    {
        idEstatus: 7,
        descripcion: 'En Desarrollo'
    },
    {
        idEstatus: 10,
        descripcion: 'Correcciones pendientes'
    }
];

const waitForInitialLoad = async () => {
    await waitFor(() => {
        expect(ClientService.getAll).toHaveBeenCalled();
        expect(OrderService.getEstatusOperaciones).toHaveBeenCalled();
        expect(OrderService.getOrdenesPorDisenador).toHaveBeenCalledWith(
            15,
            0,
            1000
        );
    });

    expect(
        await screen.findByText('Hola, Ana Diseñadora!')
    ).toBeInTheDocument();
};

describe('DesignerListPage - Pruebas de integración', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        localStorage.setItem(
            'user',
            JSON.stringify({
                idUsuario: 15,
                nombre: 'Ana Diseñadora',
                rol: 'DISENADOR'
            })
        );

        (ClientService.getAll as jest.Mock).mockResolvedValue(mockClients);

        (OrderService.getEstatusOperaciones as jest.Mock).mockResolvedValue(
            mockStatuses
        );

        (OrderService.getOrdenesPorDisenador as jest.Mock).mockResolvedValue({
            content: mockOrders
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
        localStorage.clear();
    });

    it('debe redirigir al inicio de sesión cuando no existe un usuario autenticado', async () => {
        localStorage.removeItem('user');

        render(<DesignerListPage />);

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/auth/login');
        });

        expect(OrderService.getOrdenesPorDisenador).not.toHaveBeenCalled();
        expect(ClientService.getAll).not.toHaveBeenCalled();
    });

    it('debe cargar y mostrar las órdenes asignadas al diseñador', async () => {
        render(<DesignerListPage />);

        await waitForInitialLoad();

        expect(ClientService.getAll).toHaveBeenCalled();
        expect(OrderService.getEstatusOperaciones).toHaveBeenCalled();

        expect(
            OrderService.getOrdenesPorDisenador
        ).toHaveBeenCalledWith(15, 0, 1000);

        expect(screen.getAllByText('Cliente Uno')).toHaveLength(2);
        expect(screen.getByText('Empresa Dos')).toBeInTheDocument();
        expect(screen.getAllByText('En Desarrollo')).toHaveLength(2);
        expect(
            screen.getByText('Correcciones pendientes')
        ).toBeInTheDocument();

        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('debe ordenar las órdenes rechazadas primero y las restantes por fecha ascendente', async () => {
        render(<DesignerListPage />);

        await waitForInitialLoad();

        const rows = screen.getAllByRole('row');
        const dataRows = rows.slice(1);

        const orderIds = dataRows.map((row) =>
            within(row).getAllByRole('cell')[0].textContent
        );

        expect(orderIds).toEqual(['102', '103', '101']);
    });

    it('debe mostrar el nombre del cliente y el estatus de cada orden', async () => {
        render(<DesignerListPage />);

        await waitForInitialLoad();

        const rejectedRow = screen.getByRole('row', {
            name: /102/
        });

        expect(
            within(rejectedRow).getByText('Empresa Dos')
        ).toBeInTheDocument();

        expect(
            within(rejectedRow).getByText('Correcciones pendientes')
        ).toBeInTheDocument();
    });

    it('debe utilizar el nombre del cliente incluido en la orden cuando está disponible', async () => {
        (OrderService.getOrdenesPorDisenador as jest.Mock).mockResolvedValue({
            content: [
                {
                    idOrden: 104,
                    idCliente: 99,
                    clienteNombre: 'Cliente Externo',
                    idEstatusActual: 7,
                    fechaCreacion: '2026-11-10T10:00:00',
                    montoTotal: 1200
                }
            ]
        });

        render(<DesignerListPage />);

        await waitForInitialLoad();

        expect(screen.getByText('Cliente Externo')).toBeInTheDocument();
    });

    it('debe mostrar el mensaje correspondiente cuando no existen órdenes pendientes', async () => {
        (OrderService.getOrdenesPorDisenador as jest.Mock).mockResolvedValue({
            content: []
        });

        render(<DesignerListPage />);

        await waitFor(() => {
            expect(
                OrderService.getOrdenesPorDisenador
            ).toHaveBeenCalledWith(15, 0, 1000);
        });

        expect(
            await screen.findByText(
                '¡Todo limpio! No tienes órdenes pendientes por ahora.'
            )
        ).toBeInTheDocument();

        expect(
            screen.getByText('0')
        ).toBeInTheDocument();
    });

    it('debe navegar al detalle de la orden cuando se selecciona trabajar orden', async () => {
        render(<DesignerListPage />);

        await waitForInitialLoad();

        const orderRow = screen.getByRole('row', {
            name: /101/
        });

        fireEvent.click(
            within(orderRow).getByRole('button')
        );

        expect(mockPush).toHaveBeenCalledWith('/designerdetail?id=101');
    });

    it('debe navegar al detalle de la orden cuando se selecciona corregir diseño', async () => {
        render(<DesignerListPage />);

        await waitForInitialLoad();

        const rejectedRow = screen.getByRole('row', {
            name: /102/
        });

        fireEvent.click(
            within(rejectedRow).getByRole('button')
        );

        expect(mockPush).toHaveBeenCalledWith('/designerdetail?id=102');
    });

    it('debe mostrar un error cuando falla la carga de órdenes', async () => {
        const ordersSpy = jest
            .spyOn(OrderService, 'getOrdenesPorDisenador')
            .mockRejectedValue(new Error('Error al cargar órdenes'));

        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation(() => { });

        render(<DesignerListPage />);

        await waitFor(() => {
            expect(ordersSpy).toHaveBeenCalledWith(15, 0, 1000);
        });

        expect(
            await screen.findByText('No se pudieron cargar tus órdenes.')
        ).toBeInTheDocument();

        expect(consoleErrorSpy).toHaveBeenCalled();

        ordersSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });
});
