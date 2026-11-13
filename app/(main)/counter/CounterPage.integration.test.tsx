
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Counter from '@/app/(main)/counter/page';

jest.mock('@/app/service/clientService', () => ({
    ClientService: {
        getAll: jest.fn(),
        getById: jest.fn()
    }
}));

jest.mock('@/app/service/catalogService', () => ({
    CatalogService: {
        getCondicionesPago: jest.fn(),
        getAllProductos: jest.fn(),
        getProducto: jest.fn()
    }
}));

jest.mock('@/app/service/userService', () => ({
    UserService: {
        getDesigners: jest.fn()
    }
}));

jest.mock('@/app/service/orderService', () => ({
    OrderService: {
        getOrdenes: jest.fn(),
        getEstatusOperaciones: jest.fn(),
        crearOrden: jest.fn(),
        getCotizacionesYCanceladas: jest.fn(),
        getOrdenesActivas: jest.fn(),
        getOrdenById: jest.fn(),
        updateCondicionPago: jest.fn(),
        updateNotasDiseno: jest.fn(),
        registrarPago: jest.fn(),
        avanzarEstatus: jest.fn(),
        subirArchivo: jest.fn()
    }
}));

jest.mock('next/navigation', () => ({
    useRouter: jest.fn()
}));

import { ClientService } from '@/app/service/clientService';
import { CatalogService } from '@/app/service/catalogService';
import { OrderService } from '@/app/service/orderService';
import { UserService } from '@/app/service/userService';

describe('Integración: Counter (Punto de Venta)', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();

        localStorage.setItem(
            'user',
            JSON.stringify({ idUsuario: 99, rol: 'ADMIN' })
        );

        consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        (ClientService.getAll as jest.Mock).mockResolvedValue([
            {
                id: 1,
                nombre: 'Cliente Mock',
                email: 'mock@test.com',
                rfc: 'MOCK123',
                diasCredito: 0
            }
        ]);

        (ClientService.getById as jest.Mock).mockResolvedValue({
            id: 1,
            nombre: 'Cliente Mock',
            diasCredito: 0
        });

        (UserService.getDesigners as jest.Mock).mockResolvedValue([
            {
                idUsuario: 2,
                nombre: 'Diseñador Test'
            }
        ]);

        (CatalogService.getCondicionesPago as jest.Mock).mockResolvedValue([
            {
                idCondicion: 1,
                descripcion: 'Pago Único',
                diasCredito: 0
            },
            {
                idCondicion: 2,
                descripcion: 'Anticipo 50%',
                diasCredito: 0
            }
        ]);

        (CatalogService.getAllProductos as jest.Mock).mockResolvedValue([]);

        (OrderService.getEstatusOperaciones as jest.Mock).mockResolvedValue([
            {
                idEstatus: 1,
                descripcion: 'COTIZACION'
            },
            {
                idEstatus: 2,
                descripcion: 'EN PROCESO'
            }
        ]);

        (OrderService.getOrdenes as jest.Mock).mockResolvedValue({
            content: [],
            page: { totalElements: 0 }
        });

        (OrderService.updateCondicionPago as jest.Mock).mockResolvedValue({});
        (OrderService.updateNotasDiseno as jest.Mock).mockResolvedValue({});
        (OrderService.registrarPago as jest.Mock).mockResolvedValue({});
        (OrderService.avanzarEstatus as jest.Mock).mockResolvedValue({});
    });

    afterEach(() => {
        consoleSpy.mockRestore();
        localStorage.clear();
    });

    const addProductToCart = async () => {
        const mockProduct = {
            idProducto: 1,
            descripcion: 'Lona Impresa',
            precioUnitario: 150,
            unidadVenta: 'm²',
            formatoTamano: '1x1',
            tirajeMinimo: 1
        };

        (CatalogService.getProducto as jest.Mock).mockResolvedValue([
            mockProduct
        ]);

        render(<Counter />);

        const searchInput = screen.getByPlaceholderText(
            'Escribe para buscar productos...'
        );

        fireEvent.change(searchInput, {
            target: { value: 'Lona' }
        });

        await waitFor(() => {
            expect(screen.getByText('Lona Impresa')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Lona Impresa'));

        await waitFor(() => {
            expect(
                screen.getByText('Metros Cuadrados (m²):')
            ).toBeInTheDocument();
        });

        fireEvent.click(
            screen.getByRole('button', {
                name: /Agregar a la Orden/i
            })
        );

        await waitFor(() => {
            expect(screen.getByText('Total: $150.00')).toBeInTheDocument();
        });
    };

    it('1. Debe renderizar la vista principal y cargar catálogos iniciales', async () => {
        render(<Counter />);

        expect(
            screen.getByPlaceholderText('Escribe para buscar productos...')
        ).toBeInTheDocument();

        expect(screen.getByText('Carrito vacío.')).toBeInTheDocument();

        expect(
            screen.getByRole('button', { name: /Cotizar/i })
        ).toBeDisabled();

        await waitFor(() => {
            expect(ClientService.getAll).toHaveBeenCalled();
            expect(UserService.getDesigners).toHaveBeenCalled();
        });
    });

    it('2. Debe permitir buscar un producto, ajustar cantidad y agregarlo al carrito', async () => {
        await addProductToCart();

        expect(
            screen.getByRole('button', { name: /Cotizar/i })
        ).not.toBeDisabled();
    });

    it('3. Debe generar una cotización asignando cliente y diseñador', async () => {
        (OrderService.crearOrden as jest.Mock).mockResolvedValue({
            idOrden: 100
        });

        await addProductToCart();

        fireEvent.click(
            screen.getByRole('button', { name: /Cotizar/i })
        );

        await waitFor(() => {
            expect(
                screen.getByText('Confirmar Nueva Cotización')
            ).toBeInTheDocument();
        });

        fireEvent.click(
            screen.getByRole('button', { name: /Buscar Cliente/i })
        );

        await waitFor(() => {
            expect(screen.getByText('Asignar Cliente')).toBeInTheDocument();
            expect(screen.getByText('Cliente Mock')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Cliente Mock'));

        fireEvent.click(
            screen.getByRole('button', { name: 'Seleccionar' })
        );

        const designerDropdowns = screen.getAllByText(
            'Seleccionar Diseñador'
        );

        fireEvent.click(designerDropdowns[0]);

        await waitFor(() => {
            expect(screen.getByText('Diseñador Test')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Diseñador Test'));

        fireEvent.click(
            screen.getByRole('button', { name: /Crear Cotización/i })
        );

        await waitFor(() => {
            expect(OrderService.crearOrden).toHaveBeenCalledWith(
                expect.objectContaining({
                    orden: expect.objectContaining({
                        idCliente: 1,
                        idUsuarioDisenador: 2,
                        montoTotal: 150
                    })
                })
            );
        });
    });

    it('debe retomar una cotización y registrar el pago para avanzar a orden', async () => {
        const mockQuote = {
            idOrden: 101,
            idCliente: 1,
            montoTotal: 500,
            idEstatusActual: 1,
            idUsuarioDisenador: 2,
            fechaCreacion: '2026-11-12T10:00:00Z',
            nombreDisenador: 'Diseñador Test'
        };

        (OrderService.getCotizacionesYCanceladas as jest.Mock).mockResolvedValue({
            content: [mockQuote],
            page: { totalElements: 1 }
        });

        (OrderService.getOrdenById as jest.Mock).mockResolvedValue({
            ...mockQuote,
            detalles: [
                {
                    idProducto: 1,
                    cantidad: 1,
                    precioUnitario: 500,
                    importe: 500
                }
            ]
        });

        (OrderService.crearOrden as jest.Mock).mockResolvedValue({
            idOrden: 101
        });

        render(<Counter />);

        fireEvent.click(
            screen.getByRole('button', { name: /Lista de cotizaciones/i })
        );

        await waitFor(() => {
            expect(OrderService.getCotizacionesYCanceladas).toHaveBeenCalledWith(
                0,
                10
            );
        });

        expect(await screen.findByText('#101')).toBeInTheDocument();

        fireEvent.click(
            screen.getByRole('button', { name: /Retomar/i })
        );

        expect(
            await screen.findByText('Resumen de la orden #101')
        ).toBeInTheDocument();

        fireEvent.click(
            screen.getByRole('button', { name: /Pago total \(Liquidar\)/i })
        );

        fireEvent.click(
            screen.getByRole('button', { name: /Confirmar Pago y Guardar/i })
        );

        await waitFor(() => {
            expect(OrderService.updateCondicionPago).toHaveBeenCalledWith(
                101,
                1
            );

            expect(OrderService.registrarPago).toHaveBeenCalledWith(
                101,
                expect.objectContaining({
                    monto: 500,
                    idUsuario: 99
                })
            );

            expect(OrderService.avanzarEstatus).toHaveBeenCalledWith(
                101,
                { idUsuario: 99 }
            );
        });
    });

    it('5. Debe permitir abonar a una orden activa desde la lista de órdenes', async () => {
        const mockOrder = {
            idOrden: 102,
            idCliente: 1,
            montoTotal: 1000,
            montoPagado: 500,
            idEstatusActual: 2,
            idCondicionPago: 2,
            idUsuarioDisenador: 2,
            fechaCreacion: '2026-11-12T10:00:00Z',
            nombreDisenador: 'Diseñador Test',
            saldoPendiente: 500
        };

        (OrderService.getOrdenesActivas as jest.Mock).mockResolvedValue({
            content: [mockOrder],
            page: { totalElements: 1 }
        });

        (OrderService.getOrdenById as jest.Mock).mockResolvedValue({
            ...mockOrder,
            detalles: []
        });

        render(<Counter />);

        fireEvent.click(
            screen.getByRole('button', {
                name: /Lista de ordenes/i
            })
        );

        await waitFor(() => {
            expect(OrderService.getOrdenesActivas).toHaveBeenCalledWith(
                0,
                10
            );
        });

        expect(await screen.findByText('102')).toBeInTheDocument();

        fireEvent.click(
            screen.getByRole('button', { name: /Abonar/i })
        );

        await waitFor(() => {
            expect(
                screen.getByText(/Registrar abono a orden #102/i)
            ).toBeInTheDocument();

            expect(
                screen.getByRole('button', {
                    name: /Pago total \(Liquidar\)/i
                })
            ).toBeDisabled();
        });

        fireEvent.click(
            screen.getByRole('button', { name: /Registrar Abono/i })
        );

        await waitFor(() => {
            expect(OrderService.updateCondicionPago).not.toHaveBeenCalled();

            expect(OrderService.registrarPago).toHaveBeenCalledWith(
                102,
                expect.objectContaining({
                    monto: 500
                })
            );
        });
    });
});
