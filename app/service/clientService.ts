import { Client, ClientRequest, TipoClienteFiltro, UltimaCompraDTO } from "@/app/types/clients";
import { apiClient } from "./apiClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export interface CreditoDTO {
    limiteCredito: number;
    diasCredito: number;
    creditoHabilitado: boolean;
}

export const ClientService = {
    async getAll(tipo?: TipoClienteFiltro): Promise<Client[]> {
        const isFiltered = tipo && tipo !== 'todos';
        const endpoint = isFiltered
            ? `${API_BASE_URL}/clientes/filtrar?tipo=${tipo}`
            : `${API_BASE_URL}/clientes`;

        const res = await apiClient(endpoint);

        if (!res.ok) throw new Error("Error al obtener clientes");

        const data = await res.json();
        const listaCruda = Array.isArray(data) ? data : (data.content || []);

        return listaCruda.map((item: any) => ({
            ...item,
            id: item.idCliente || item.id,
            nombre: item.nombre || '',
            email: item.email || '',
            rfc: item.rfc || '',
            totalCompras: item.totalCompras ?? item.comprasCount ?? 0,
        }));
    },

    async getById(id: number): Promise<Client> {
        const res = await apiClient(`${API_BASE_URL}/clientes/${id}`);
        if (!res.ok) {
            throw new Error("No se pudo obtener el cliente");
        }
        return await res.json();
    },

    async getLastPurchase(idCliente: number): Promise<UltimaCompraDTO> {
        const res = await apiClient(`${API_BASE_URL}/clientes/${idCliente}/ultima-compra`);
        if (!res.ok) {
            throw new Error("No se pudo obtener la última compra del cliente");
        }
        return await res.json();
    },

    async getPurchasesCount(idCliente: number): Promise<number> {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return idCliente % 2 === 0 ? 2 : 4;
    },

    async uploadDocuments(idCliente: number, files: { csf: File; comprobanteDomicilio: File; ine: File }) {
        const documentos = [
            { file: files.csf, tipo: 'CSF' },
            { file: files.comprobanteDomicilio, tipo: 'COMPROBANTE_DOMICILIO' },
            { file: files.ine, tipo: 'INE' }
        ];

        for (const doc of documentos) {
            const formData = new FormData();
            formData.append('file', doc.file); // o 'documento' según acepte tu backend
            formData.append('tipoDocumento', doc.tipo);

            const response = await apiClient(`${API_BASE_URL}/clientes/${idCliente}/documentos`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Error al subir el documento ${doc.tipo}`);
            }
        }
    },

    async getDocuments(idCliente: number): Promise<any[]> {
        try {
            const res = await apiClient(`${API_BASE_URL}/clientes/${idCliente}/documentos`);
            if (!res.ok) return [];
            const data = await res.json();
            return Array.isArray(data) ? data : (data.documentos || []);
        } catch {
            return [];
        }
    },

    async downloadDocument(idCliente: number, idDocumento: number): Promise<{ blob: Blob; filename: string }> {
        const res = await apiClient(`${API_BASE_URL}/clientes/${idCliente}/documentos/${idDocumento}/descargar`);

        if (!res.ok) {
            throw new Error("Error al descargar el documento");
        }

        const contentDisposition = res.headers.get('content-disposition');
        let filename = `documento_${idDocumento}`;

        if (contentDisposition && contentDisposition.includes('filename=')) {
            filename = contentDisposition.split('filename=')[1].replace(/["']/g, '');
        }

        const blob = await res.blob();
        return { blob, filename };
    },

    async updateCredit(idCliente: number, dto: CreditoDTO) {
        const res = await apiClient(`${API_BASE_URL}/clientes/${idCliente}/credito`, {
            method: 'PUT',
            body: JSON.stringify(dto),
        });
        if (!res.ok) {
            const errorBody = await res.json();
            throw errorBody;
        }
        return await res.json();
    },

    async create(client: ClientRequest) {
        const response = await apiClient(`${API_BASE_URL}/clientes`, {
            method: 'POST',
            body: JSON.stringify(client)
        });
        if (!response.ok) {
            const errorBody = await response.json();
            throw errorBody;
        }
        return await response.json();
    },

    async update(id: number, client: ClientRequest) {
        const response = await apiClient(`${API_BASE_URL}/clientes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(client)
        });
        if (!response.ok) {
            const errorBody = await response.json();
            throw errorBody;
        }
        return await response.json();
    },

    async delete(id: number) {
        const res = await apiClient(`${API_BASE_URL}/clientes/${id}`, {
            method: "DELETE"
        });
        if (!res.ok) throw new Error("Error al eliminar cliente");
        return true;
    }
};