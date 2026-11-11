import { apiClient } from './apiClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export interface DetalleSolicitud {
    idDetalle: number;
    idProducto: number;
    cantidad: number;
}

export interface SolicitudCompra {
    idSolicitud: number;
    idOrden: number;
    idUsuarioSolicitante: number;
    idEstatus: number;
    fechaCreacion: string;
    descripcionSolicitud: string;
    detalles: DetalleSolicitud[];
}

export const comprasService = {
    async getPendientes(): Promise<SolicitudCompra[]> {
        const response = await apiClient(`${API_BASE_URL}/compras/pendientes`, {
            method: 'GET'
        });

        if (!response.ok) {
            throw new Error('Error al obtener compras pendientes');
        }

        return await response.json();
    },

    async registrarCompraExitosa(idSolicitud: number, costoReal: number, comprobante: File, userId: number = 11): Promise<void> {
        const formData = new FormData();
        formData.append('costoReal', costoReal.toString());
        formData.append('comprobante', comprobante);

        const response = await apiClient(`${API_BASE_URL}/compras/${idSolicitud}/compra-exitosa`, {
            method: 'POST',
            headers: {
                'X-User-Id': userId.toString()
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Error al registrar la compra exitosa');
        }
    },

    async registrarCompraAtrasada(idSolicitud: number, costoReal: number, nuevaFechaEntrega: string, comprobante: File, userId: number = 11): Promise<void> {
        const formData = new FormData();
        formData.append('costoReal', costoReal.toString());
        formData.append('nuevaFechaEntrega', nuevaFechaEntrega);
        formData.append('comprobante', comprobante);

        const response = await apiClient(`${API_BASE_URL}/compras/${idSolicitud}/compra-atrasada`, {
            method: 'POST',
            headers: {
                'X-User-Id': userId.toString()
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Error al registrar la compra atrasada');
        }
    },

    async registrarLlegadaAtrasada(idSolicitud: number, userId: number = 11): Promise<void> {
        const response = await apiClient(`${API_BASE_URL}/compras/${idSolicitud}/llegada-atrasada`, {
            method: 'PUT',
            headers: {
                'X-User-Id': userId.toString()
            }
        });

        if (!response.ok) {
            throw new Error('Error al registrar la llegada de los insumos atrasados');
        }
    }
};