
import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import PrintOrderPage from './page';

import { OrderService } from '@/app/service/orderService';
import { CatalogService } from '@/app/service/catalogService';
import { ClientService } from '@/app/service/clientService';
import { SobranteService } from '@/app/service/leftoverService';
import { downloadDesignFile } from '@/app/utils/downloadUtils';

const mockPush = jest.fn();
const mockShow = jest.fn();
const mockSearchParams = { get: jest.fn(() => '101') };

jest.mock('next/navigation', () => ({
    useSearchParams: () => mockSearchParams,
    useRouter: () => ({ push: mockPush })
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

jest.mock('@/app/service/orderService', () => ({
    OrderService: {
        getOrdenById: jest.fn(),
        avanzarEstatus: jest.fn(),
        getArchivoUrlVerificado: jest.fn()
    }
}));

jest.mock('@/app/service/catalogService', () => ({
    CatalogService: {
        getAllProductos: jest.fn()
    }
}));

jest.mock('@/app/service/clientService', () => ({
    ClientService: {
        getById: jest.fn()
    }
}));

jest.mock('@/app/service/leftoverService', () => ({
    SobranteService: {
        getSobrantesPorCliente: jest.fn(),
        consumirSobrante: jest.fn(),
        registrarSobrante: jest.fn()
    }
}));

jest.mock('@/app/utils/downloadUtils', () => ({
    downloadDesignFile: jest.fn()
}));

jest.mock('primereact/toast', () => {
    const React = require('react');

    return {
        Toast: React.forwardRef((props: any, ref: any) => {
            React.useImperativeHandle(ref, () => ({
                show: mockShow
            }));

            return <div data-testid="toast" />;
        })
    };
});

jest.mock('primereact/card', () => ({
    Card: ({ title, children }: any) => (
        <section>
            {title && <h2>{title}</h2>}
            {children}
        </section>
    )
}));

jest.mock('primereact/button', () => ({
    Button: ({ label, onClick, disabled, children }: any) => (
        <button onClick={onClick} disabled={disabled}>
            {label || children}
        </button>
    )
}));

jest.mock('primereact/tag', () => ({
    Tag: ({ value }: any) => <span>{value}</span>
}));

jest.mock('primereact/image', () => ({
    Image: ({ src, alt, onError }: any) => (
        <img src={src} alt={alt} onError={onError} />
    )
}));

jest.mock('primereact/column', () => ({
    Column: () => null
}));

jest.mock('primereact/datatable', () => ({
    DataTable: ({ value, emptyMessage }: any) => (
        <div data-testid="order-products">
            {value.length === 0
                ? emptyMessage
                : value.map((item: any) => (
                    <div key={item.idDetalle}>
                        <span>{item.cantidad}</span>
                        <span>{item.nombreProducto}</span>
                        <span>{item.medidas}</span>
                    </div>
                ))}
        </div>
    )
}));

jest.mock('@/app/components/LeftoversDialog', () => ({
    LeftoversDialog: ({ visible, onConfirm, onHide, isSubmitting }: any) => (
        visible ? (
            <div data-testid="leftovers-dialog">
                <button
                    disabled={isSubmitting}
                    onClick={() => onConfirm(false, {})}
                >
                    Finalizar sin sobrantes
                </button>
                <button
                    disabled={isSubmitting}
                    onClick={() => onConfirm(true, { 1: 3 })}
                >
                    Finalizar con sobrantes
                </button>
                <button onClick={onHide}>Cerrar sobrantes</button>
            </div>
        ) : null
    )
}));

jest.mock('@/app/components/ConsumeLeftoverDialog', () => ({
    ConsumeLeftoverDialog: ({
        visible,
        onConfirm,
        onHide,
        productName,
        maxQuantity,
        isConsuming
    }: any) => (
        visible ? (
            <div data-testid="consume-dialog">
                <span>{productName}</span>
                <span>{maxQuantity}</span>
                <button
                    disabled={isConsuming}
                    onClick={() => onConfirm(2)}
                >
                    Confirmar consumo
                </button>
                <button onClick={onHide}>Cerrar consumo</button>
            </div>
        ) : null
    )
}));

const mockOrder = {
    idOrden: 101,
    idCliente: 1,
    idEstatusActual: 5,
    fechaEntregaFormal: '2026-11-20',
    montoTotal: 2500,
    rutaArchivo: 'disenos/orden-101.pdf',
    notasDiseno: 'Impresión a doble cara',
    detalles: [
        { idDetalle: 1, idProducto: 10, cantidad: 25 },
        { idDetalle: 2, idProducto: 20, cantidad: 100 }
    ]
};

const mockProducts = [
    {
        idProducto: 10,
        descripcion: 'Tarjetas de presentación',
        formatoTamano: '10 x 5 cm',
        unidadVenta: 'Piezas'
    },
    {
        idProducto: 20,
        descripcion: 'Hojas de papel',
        formatoTamano: 'Carta',
        unidadVenta: 'Hojas'
    }
];

const mockClient = {
    id: 1,
    nombre: 'Empresa Uno',
    telefono: '2291234567'
};

const mockLeftovers = {
    content: [
        {
            idSobrante: 1,
            cantidadDisponible: 15,
            producto: { idProducto: 10 }
        },
        {
            idSobrante: 2,
            cantidadDisponible: 0,
            producto: { idProducto: 10 }
        },
        {
            idSobrante: 3,
            cantidadDisponible: 20,
            producto: { idProducto: 99 }
        }
    ]
};

const waitForInitialLoad = async () => {
    await screen.findByText('Orden N° 101');
    await screen.findByText('Empresa Uno');
};

describe('PrintOrderPage - Pruebas de integración', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        localStorage.setItem(
            'user',
            JSON.stringify({ idUsuario: 7 })
        );

        (OrderService.getOrdenById as jest.Mock).mockResolvedValue(mockOrder);
        (OrderService.avanzarEstatus as jest.Mock).mockResolvedValue({});
        (OrderService.getArchivoUrlVerificado as jest.Mock).mockResolvedValue(null);

        (CatalogService.getAllProductos as jest.Mock).mockResolvedValue(mockProducts);
        (ClientService.getById as jest.Mock).mockResolvedValue(mockClient);

        (SobranteService.getSobrantesPorCliente as jest.Mock).mockResolvedValue({
            content: []
        });
        (SobranteService.consumirSobrante as jest.Mock).mockResolvedValue({});
        (SobranteService.registrarSobrante as jest.Mock).mockResolvedValue({});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        localStorage.clear();
    });

    it('debe mostrar los datos de la orden y sus productos', async () => {
        render(<PrintOrderPage />);

        await waitForInitialLoad();

        expect(OrderService.getOrdenById).toHaveBeenCalledWith(101);
        expect(CatalogService.getAllProductos).toHaveBeenCalled();

        expect(screen.getByText('Tarjetas de presentación')).toBeInTheDocument();
        expect(screen.getByText('Hojas de papel')).toBeInTheDocument();
        expect(screen.getByText('10 x 5 cm')).toBeInTheDocument();
        expect(screen.getByText('En impresión')).toBeInTheDocument();
    });

    it('debe mostrar el nombre y teléfono del cliente', async () => {
        render(<PrintOrderPage />);

        await waitForInitialLoad();

        expect(screen.getByText('Empresa Uno')).toBeInTheDocument();
        expect(screen.getByText('2291234567')).toBeInTheDocument();

        expect(ClientService.getById).toHaveBeenCalledWith(1);
    });

    it('debe mostrar Mostrador cuando la orden no tiene cliente', async () => {
        (OrderService.getOrdenById as jest.Mock).mockResolvedValue({
            ...mockOrder,
            idCliente: null
        });

        render(<PrintOrderPage />);

        await screen.findByText('Orden N° 101');

        expect(screen.getByText('Mostrador')).toBeInTheDocument();
        expect(ClientService.getById).not.toHaveBeenCalled();
        expect(SobranteService.getSobrantesPorCliente).not.toHaveBeenCalled();
    });

    it('debe avanzar automáticamente una orden aprobada al estatus 5', async () => {
        (OrderService.getOrdenById as jest.Mock).mockResolvedValue({
            ...mockOrder,
            idEstatusActual: 9
        });

        render(<PrintOrderPage />);

        await waitForInitialLoad();

        await waitFor(() => {
            expect(OrderService.avanzarEstatus).toHaveBeenCalledWith(
                101,
                {
                    idUsuario: 7,
                    idEstatusDestino: 5,
                    clienteAprobo: true
                }
            );
        });

        expect(mockShow).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'info',
                summary: 'Producción iniciada'
            })
        );
    });

    it('debe continuar mostrando la orden si falla el autoavance a impresión', async () => {
        (OrderService.getOrdenById as jest.Mock).mockResolvedValue({
            ...mockOrder,
            idEstatusActual: 9
        });

        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        (OrderService.avanzarEstatus as jest.Mock).mockRejectedValue(
            new Error('Error de actualización')
        );

        render(<PrintOrderPage />);

        await waitForInitialLoad();

        expect(screen.getByText('Tarjetas de presentación')).toBeInTheDocument();
        expect(errorSpy).toHaveBeenCalledWith(
            'Error auto-avance a impresión',
            expect.any(Error)
        );
    });

    it('debe mostrar la imagen cuando existe un archivo de diseño', async () => {
        (OrderService.getArchivoUrlVerificado as jest.Mock).mockResolvedValue(
            'https://servidor.com/diseno.png'
        );

        render(<PrintOrderPage />);

        await waitForInitialLoad();

        const image = await screen.findByAltText('Diseño Final');

        expect(image).toHaveAttribute(
            'src',
            'https://servidor.com/diseno.png'
        );
        expect(screen.getByText('Descargar diseño')).toBeInTheDocument();
    });

    it('debe mostrar el mensaje de archivo no encontrado cuando ocurre un error en la imagen', async () => {
        (OrderService.getArchivoUrlVerificado as jest.Mock).mockResolvedValue(
            'https://servidor.com/diseno.png'
        );

        render(<PrintOrderPage />);

        await waitForInitialLoad();

        fireEvent.error(await screen.findByAltText('Diseño Final'));

        expect(
            await screen.findByText('Archivo no encontrado (404)')
        ).toBeInTheDocument();
    });

    it('debe ejecutar la descarga del diseño', async () => {
        (OrderService.getArchivoUrlVerificado as jest.Mock).mockResolvedValue(
            'https://servidor.com/diseno.png'
        );

        render(<PrintOrderPage />);

        await waitForInitialLoad();

        fireEvent.click(await screen.findByText('Descargar diseño'));

        expect(downloadDesignFile).toHaveBeenCalledWith(
            expect.objectContaining({
                imageUrl: 'https://servidor.com/diseno.png',
                rutaArchivo: 'disenos/orden-101.pdf',
                fallbackFilename: 'referencia-orden-101'
            })
        );
    });

    it('debe mostrar únicamente los sobrantes válidos de los productos de la orden', async () => {
        (SobranteService.getSobrantesPorCliente as jest.Mock).mockResolvedValue(
            mockLeftovers
        );

        render(<PrintOrderPage />);

        await waitForInitialLoad();

        expect(
            screen.getByText(/Este cliente tiene inventario sobrante/)
        ).toBeInTheDocument();

        expect(screen.getByText(/15 unidades disponibles/)).toBeInTheDocument();
        expect(screen.queryByText(/20 unidades disponibles/)).not.toBeInTheDocument();

        expect(mockShow).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'warn',
                summary: 'Sobrantes disponibles'
            })
        );
    });

    it('debe abrir el diálogo para consumir un sobrante', async () => {
        (SobranteService.getSobrantesPorCliente as jest.Mock).mockResolvedValue(
            mockLeftovers
        );

        render(<PrintOrderPage />);

        await waitForInitialLoad();

        fireEvent.click(screen.getByText('Consumir material'));
        const consumeDialog = screen.getByTestId('consume-dialog');

        expect(consumeDialog).toBeInTheDocument();
        expect(
            within(consumeDialog).getByText('Tarjetas de presentación')
        ).toBeInTheDocument();
        expect(within(consumeDialog).getByText('15')).toBeInTheDocument();
    });

    it('debe consumir un sobrante y recargar la orden', async () => {
        (SobranteService.getSobrantesPorCliente as jest.Mock).mockResolvedValue(
            mockLeftovers
        );

        render(<PrintOrderPage />);

        await waitForInitialLoad();

        fireEvent.click(screen.getByText('Consumir material'));
        fireEvent.click(screen.getByText('Confirmar consumo'));

        await waitFor(() => {
            expect(SobranteService.consumirSobrante).toHaveBeenCalledWith(1, 2);
        });

        await waitFor(() => {
            expect(OrderService.getOrdenById).toHaveBeenCalledTimes(2);
        });

        expect(mockShow).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'success',
                summary: 'Inventario actualizado'
            })
        );
    });

    it('debe mostrar un error cuando falla el consumo de sobrantes', async () => {
        (SobranteService.getSobrantesPorCliente as jest.Mock).mockResolvedValue(
            mockLeftovers
        );

        (SobranteService.consumirSobrante as jest.Mock).mockRejectedValue(
            new Error('No se pudo actualizar el inventario')
        );

        render(<PrintOrderPage />);

        await waitForInitialLoad();

        fireEvent.click(screen.getByText('Consumir material'));
        fireEvent.click(screen.getByText('Confirmar consumo'));

        await waitFor(() => {
            expect(mockShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'error',
                    detail: 'No se pudo actualizar el inventario'
                })
            );
        });
    });

    it('debe abrir y cerrar el diálogo de finalización', async () => {
        render(<PrintOrderPage />);

        await waitForInitialLoad();

        fireEvent.click(screen.getByText('Orden lista para entrega'));

        expect(screen.getByTestId('leftovers-dialog')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Cerrar sobrantes'));

        expect(screen.queryByTestId('leftovers-dialog')).not.toBeInTheDocument();
    });

    it('debe finalizar la orden sin registrar sobrantes', async () => {
        render(<PrintOrderPage />);

        await waitForInitialLoad();

        fireEvent.click(screen.getByText('Orden lista para entrega'));
        fireEvent.click(screen.getByText('Finalizar sin sobrantes'));

        await waitFor(() => {
            expect(OrderService.avanzarEstatus).toHaveBeenCalledWith(
                101,
                {
                    idUsuario: 7,
                    idEstatusDestino: 6,
                    clienteAprobo: true
                }
            );
        });

        expect(SobranteService.registrarSobrante).not.toHaveBeenCalled();

        expect(mockShow).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'success',
                summary: 'Orden Terminada'
            })
        );
    });

    it('debe registrar los sobrantes antes de finalizar la orden', async () => {
        render(<PrintOrderPage />);

        await waitForInitialLoad();

        fireEvent.click(screen.getByText('Orden lista para entrega'));
        fireEvent.click(screen.getByText('Finalizar con sobrantes'));

        await waitFor(() => {
            expect(SobranteService.registrarSobrante).toHaveBeenCalledWith({
                idCliente: 1,
                idProducto: 10,
                idOrden: 101,
                cantidad: 3
            });
        });

        expect(OrderService.avanzarEstatus).toHaveBeenCalledWith(
            101,
            {
                idUsuario: 7,
                idEstatusDestino: 6,
                clienteAprobo: true
            }
        );
    });

    it('debe mostrar un error si falla la finalización de la orden', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        (OrderService.avanzarEstatus as jest.Mock).mockRejectedValue(
            new Error('Error al finalizar')
        );

        render(<PrintOrderPage />);

        await waitForInitialLoad();

        fireEvent.click(screen.getByText('Orden lista para entrega'));
        fireEvent.click(screen.getByText('Finalizar sin sobrantes'));

        await waitFor(() => {
            expect(mockShow).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: 'error',
                    detail: 'Ocurrió un problema al procesar la orden o los sobrantes.'
                })
            );
        });

        expect(errorSpy).toHaveBeenCalled();
    });

    it('debe mostrar el estado de error cuando falla la carga de la orden', async () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        (OrderService.getOrdenById as jest.Mock).mockRejectedValue(
            new Error('Error de conexión')
        );

        render(<PrintOrderPage />);

        expect(
            await screen.findByText('No se pudo cargar la orden')
        ).toBeInTheDocument();

        expect(screen.getByText('Verifica tu conexión e intenta nuevamente.'))
            .toBeInTheDocument();

        expect(mockShow).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'error',
                detail: 'No se pudo cargar la orden.'
            })
        );

        expect(errorSpy).toHaveBeenCalled();
    });

    it('debe regresar a la lista de órdenes desde el estado de error', async () => {
        (OrderService.getOrdenById as jest.Mock).mockRejectedValue(
            new Error('Error de conexión')
        );

        jest.spyOn(console, 'error').mockImplementation(() => { });

        render(<PrintOrderPage />);

        fireEvent.click(
            await screen.findByText('Volver a la lista')
        );

        expect(mockPush).toHaveBeenCalledWith('/workshoplist');
    });
});
