import { apiClient } from "./apiClient";

export interface NuevoUsuario {
    nombre: string;
    email: string;
    password: string;
    rol: number | null;
}

export interface CambiarPasswordRequest {
    passwordActual: string;
    nuevaPassword: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const UserService = {
    async getAll() {
        const res = await apiClient(`${API_BASE_URL}/usuarios`);
        if (!res.ok) throw new Error("Error al obtener usuarios");
        return await res.json();
    },

    async getDesigners() {
        const res = await apiClient(`${API_BASE_URL}/usuarios/disenadores`);
        if (!res.ok) throw new Error("Error al obtener lista de diseñadores");
        return await res.json();
    },

    async cambiarPassword(
        idUsuario: number,
        payload: CambiarPasswordRequest,
        tokenOverride?: string
    ): Promise<{ mensaje: string }> {
        const headers: Record<string, string> = {};
        if (tokenOverride) {
            headers['Authorization'] = `Bearer ${tokenOverride}`;
        }

        const res = await apiClient(`${API_BASE_URL}/usuarios/${idUsuario}/cambiar-password`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload)
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            throw new Error(data.message || data.error || 'No se pudo actualizar la contraseña');
        }

        return data;
    }
};

export async function registrarUsuario(data: NuevoUsuario) {
    if (!API_BASE_URL) {
        throw new Error("La URL de la API no está configurada en las variables de entorno");
    }

    try {
        const response = await apiClient(`${API_BASE_URL}/usuarios`, {
            method: "POST",
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.text().catch(() => null);
            throw new Error(errorData || "Error al registrar usuario");
        }
        return await response.json();

    } catch (error) {
        console.error("Error en servicio registrarUsuario:", error);
        throw error;
    }
}