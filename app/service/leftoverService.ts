import { apiClient } from './apiClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export interface RegistrarSobranteRequest {
    idCliente: number;
    idProducto: number;
    idOrden: number;
    cantidad: number;
}

export const SobranteService = {

    async getAllSobrantes(page: number = 0, size: number = 10) {
        const res = await apiClient(`${API_BASE_URL}/sobrantes?page=${page}&size=${size}`, {
            method: 'GET'
        });
        if (!res.ok) throw new Error('Error al obtener todos los sobrantes');
        return await res.json();
    },

    async getSobrantesPorCliente(idCliente: number, page: number = 0, size: number = 10) {
        const res = await apiClient(`${API_BASE_URL}/sobrantes/cliente/${idCliente}?page=${page}&size=${size}`, {
            method: 'GET'
        });
        if (!res.ok) throw new Error('Error al obtener los sobrantes del cliente');
        return await res.json();
    },

    async registrarSobrante(data: RegistrarSobranteRequest) {
        const res = await apiClient(`${API_BASE_URL}/sobrantes`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Error al registrar el sobrante');
        return await res.json();
    },

    async consumirSobrante(idSobrante: number, cantidadConsumida: number) {
        const res = await apiClient(`${API_BASE_URL}/sobrantes/${idSobrante}/consumir`, {
            method: 'PUT',
            body: JSON.stringify({ cantidadConsumida })
        });
        
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || 'Error al consumir el sobrante');
        }
        
        return await res.json();
    }
};