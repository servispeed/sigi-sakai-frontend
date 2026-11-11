'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import Link from 'next/link';

import { comprasService, SolicitudCompra, DetalleSolicitud } from '@/app/service/shopService';
import { Producto } from '@/app/types/orders';
import { CatalogService } from '@/app/service/catalogService';

import { PurchaseActionDialog, PurchaseDialogMode, PurchaseSubmitData } from '@/app/components/PurchaseDialog';

const formatCantidadInsumo = (cantidad: number, producto?: Producto): string => {
    if (!producto) {
        return `${cantidad} unidad(es)`;
    }

    const unidadVenta = producto.unidadVenta || '';
    const cantidadPaquete = producto.cantidadPaquete;

    if (cantidadPaquete && cantidadPaquete > 1) {
        const totalPiezas = cantidad * cantidadPaquete;
        return `${cantidad} ${unidadVenta} (${totalPiezas.toLocaleString()} pzs en total)`;
    }

    if (unidadVenta.toLowerCase().includes('m²')) {
        return `${cantidad} m²`;
    }

    return `${cantidad} ${unidadVenta || 'unidad(es)'}`;
};

const UploadReceiptPage = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderIdParam = searchParams.get('id');
    const toast = useRef<Toast>(null);

    const [solicitud, setSolicitud] = useState<SolicitudCompra | null>(null);
    const [productosMap, setProductosMap] = useState<Map<string, Producto>>(new Map());
    const [loading, setLoading] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    // Estados para controlar el Dialog Inteligente
    const [dialogVisible, setDialogVisible] = useState<boolean>(false);
    const [dialogMode, setDialogMode] = useState<PurchaseDialogMode>('SUCCESS');

    useEffect(() => {
        const fetchData = async () => {
            if (!orderIdParam) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                const [pendientes, listaProductos] = await Promise.all([
                    comprasService.getPendientes(),
                    CatalogService.getProductos().catch((err) => {
                        console.error('Error al cargar productos:', err);
                        return [] as Producto[];
                    })
                ]);

                const map = new Map<string, Producto>();
                listaProductos.forEach((prod: any) => {
                    const key = String(prod.idProducto ?? prod.id ?? '');
                    if (key) {
                        map.set(key, prod);
                    }
                });
                setProductosMap(map);

                const encontrada = pendientes.find(
                    (s) => String(s.idOrden) === String(orderIdParam)
                );

                if (encontrada) {
                    setSolicitud(encontrada);
                } else {
                    toast.current?.show({
                        severity: 'warn',
                        summary: 'Solicitud no encontrada',
                        detail: `No se encontró una solicitud activa para la orden #${orderIdParam}`,
                        life: 4000
                    });
                }
            } catch (error) {
                console.error('Error al cargar la información:', error);
                toast.current?.show({
                    severity: 'error',
                    summary: 'Error de Servidor',
                    detail: 'No se pudo cargar la información de la solicitud de insumos.',
                    life: 4000
                });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [orderIdParam]);

    const openDialog = (mode: PurchaseDialogMode) => {
        setDialogMode(mode);
        setDialogVisible(true);
    };

    // Este único manejador procesa las 3 acciones dependiendo del modo del modal
    const handleDialogSubmit = async (data: PurchaseSubmitData) => {
        if (!solicitud) return;
        setIsSubmitting(true);

        try {
            if (dialogMode === 'SUCCESS') {
                await comprasService.registrarCompraExitosa(solicitud.idSolicitud, data.costoReal!, data.file!);
                toast.current?.show({ severity: 'success', summary: 'Éxito', detail: 'Compra registrada correctamente.', life: 3000 });
            }
            else if (dialogMode === 'DELAY') {
                await comprasService.registrarCompraAtrasada(solicitud.idSolicitud, data.costoReal!, data.fechaEntrega!, data.file!);
                toast.current?.show({ severity: 'success', summary: 'Éxito', detail: 'Compra y atraso registrados.', life: 3000 });
            }
            else if (dialogMode === 'ARRIVAL') {
                await comprasService.registrarLlegadaAtrasada(solicitud.idSolicitud);
                toast.current?.show({ severity: 'success', summary: 'Éxito', detail: 'Llegada de insumos confirmada.', life: 3000 });
            }

            setDialogVisible(false);
            setTimeout(() => router.push('/'), 2000);

        } catch (error) {
            console.error(error);
            toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Ocurrió un error al procesar la solicitud.', life: 4000 });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="grid justify-content-center">
            <Toast ref={toast} />

            {loading ? (
                <div className="flex justify-content-center align-items-center p-6 gap-3">
                    <i className="pi pi-spin pi-spinner text-3xl text-primary"></i>
                    <span className="text-lg text-600">
                        Cargando solicitud de insumos...
                    </span>
                </div>
            ) : (
                <>
                    <div className="col-12 md:col-8 lg:col-6">
                        <div className="flex align-items-center gap-3 mb-4">
                            <Link href="/" passHref legacyBehavior>
                                <a className="p-button p-component p-button-text p-button-rounded p-button-icon-only">
                                    <i className="pi pi-arrow-left text-xl"></i>
                                </a>
                            </Link>

                            <h1 className="m-0 text-3xl font-bold">
                                Orden N° {orderIdParam}
                            </h1>
                        </div>

                        {/* Detalle de Insumos Reales */}
                        <Card className="mb-4 shadow-2">
                            <h2 className="text-xl font-bold m-0 mb-3 flex align-items-center">
                                <i className="pi pi-list mr-2 text-blue-500"></i>
                                Detalle de la solicitud
                            </h2>

                            <div className="mb-3">
                                <span className="block text-900 font-medium text-lg">
                                    {solicitud?.descripcionSolicitud ||
                                        'Solicitud de Insumos para Producción'}
                                </span>

                                <span className="block text-500 text-sm mt-1">
                                    Solicitud #{solicitud?.idSolicitud || 'N/A'} -
                                    Creada el:{' '}
                                    {solicitud?.fechaCreacion
                                        ? new Date(
                                            solicitud.fechaCreacion
                                        ).toLocaleString()
                                        : '-'}
                                </span>
                            </div>

                            <div className="surface-100 p-3 border-round">
                                <div className="font-bold mb-3 text-900">
                                    Materiales / Insumos requeridos:
                                </div>

                                {solicitud?.detalles && solicitud.detalles.length > 0 ? (
                                    <ul className="list-none p-0 m-0 flex flex-column gap-2">
                                        {solicitud.detalles.map(
                                            (det: DetalleSolicitud) => {
                                                const productIdKey = String(det.idProducto);
                                                const producto = productosMap.get(productIdKey);
                                                const tituloProducto = producto?.nombre || producto?.descripcion || `Producto ID #${det.idProducto}`;
                                                const textoCantidad = formatCantidadInsumo(det.cantidad, producto);

                                                return (
                                                    <li
                                                        key={det.idDetalle}
                                                        className="surface-card p-3 border-round border-1 surface-border flex align-items-center justify-content-between shadow-1"
                                                    >
                                                        <div className="flex align-items-center gap-3">
                                                            <i className="pi pi-box text-xl text-primary"></i>

                                                            <div className="flex flex-column">
                                                                <span className="font-bold text-900 text-sm">
                                                                    {tituloProducto}
                                                                </span>

                                                                {producto?.formatoTamano && (
                                                                    <span className="text-xs text-500">
                                                                        Formato:{' '}
                                                                        {producto.formatoTamano}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="text-right">
                                                            <span className="p-tag p-tag-info font-bold text-sm">
                                                                {textoCantidad}
                                                            </span>
                                                        </div>
                                                    </li>
                                                );
                                            }
                                        )}
                                    </ul>
                                ) : (
                                    <span className="text-500 text-sm">
                                        Sin detalles de insumos registrados.
                                    </span>
                                )}
                            </div>
                        </Card>

                        {/* PANEL DINÁMICO DE ACCIONES */}
                        <Card className={`shadow-4 border-top-3 ${solicitud?.idEstatus === 3 ? 'border-yellow-500 bg-yellow-50' : 'border-primary bg-blue-50'} mt-4`}>

                            {solicitud?.idEstatus === 3 ? (
                                <div className="text-center py-2">
                                    <i className="pi pi-clock text-5xl text-yellow-600 mb-3"></i>
                                    <h2 className="text-2xl font-bold m-0 text-yellow-700 mb-2">Insumos atrasados</h2>
                                    <p className="text-yellow-700 mb-4">
                                        Esta solicitud está marcada como ATRASADA. El gasto ya fue cobrado y registrado.
                                    </p>
                                    <Button
                                        label="Confirmar llegada de los insumos"
                                        icon="pi pi-check-circle"
                                        severity="success"
                                        size="large"
                                        className="w-full md:w-auto shadow-2"
                                        onClick={() => openDialog('ARRIVAL')}
                                    />
                                </div>
                            ) : (
                                <div className="py-2">
                                    <h2 className="text-2xl font-bold m-0 text-primary-700 text-center mb-4">¿Qué deseas hacer con esta solicitud?</h2>
                                    <div className="flex flex-column md:flex-row justify-content-center gap-3">
                                        <Button
                                            label="Registrar compra exitosa"
                                            icon="pi pi-save"
                                            severity={undefined}
                                            className="w-full md:w-auto shadow-2"
                                            onClick={() => openDialog('SUCCESS')}
                                        />
                                        <Button
                                            label="Reportar insumos atrasados"
                                            icon="pi pi-calendar-plus"
                                            severity="warning"
                                            className="w-full md:w-auto shadow-2"
                                            onClick={() => openDialog('DELAY')}
                                        />
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>

                    <PurchaseActionDialog
                        visible={dialogVisible}
                        mode={dialogMode}
                        onHide={() => setDialogVisible(false)}
                        onSubmit={handleDialogSubmit}
                        isSubmitting={isSubmitting}
                    />
                </>
            )}
        </div>
    );
};
export default UploadReceiptPage;