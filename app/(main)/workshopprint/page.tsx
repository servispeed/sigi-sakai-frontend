/* eslint-disable @next/next/no-img-element */
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { Image } from 'primereact/image';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import Link from 'next/link';
import { Tag } from 'primereact/tag';

// Servicios
import { OrderService } from '@/app/service/orderService';
import { CatalogService } from '@/app/service/catalogService';
import { ClientService } from '@/app/service/clientService';
import { SobranteService } from '@/app/service/leftoverService';
import { downloadDesignFile } from '@/app/utils/downloadUtils';

// Componentes
import { LeftoversDialog } from '@/app/components/LeftoversDialog';
import { ConsumeLeftoverDialog } from '@/app/components/ConsumeLeftoverDialog';

const PrintOrderPage = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderId = searchParams.get('id');
    const toast = useRef<Toast>(null);

    // --- ESTADOS DE LA ORDEN ---
    const [orderData, setOrderData] = useState<any>(null);
    const [clientData, setClientData] = useState<any>(null);
    const [orderItems, setOrderItems] = useState<any[]>([]);
    const [loadError, setLoadError] = useState(false);

    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- ESTADOS DE SOBRANTES ---
    const [existingLeftovers, setExistingLeftovers] = useState<any[]>([]);
    const [showLeftoversDialog, setShowLeftoversDialog] = useState(false);

    // NUEVOS ESTADOS PARA CONSUMIR
    const [showConsumeDialog, setShowConsumeDialog] = useState(false);
    const [isConsuming, setIsConsuming] = useState(false);
    const [consumeData, setConsumeData] = useState<{ idSobrante: number, maxAmount: number, productName: string } | null>(null);

    useEffect(() => {
        if (orderId) {
            loadInitialData(Number(orderId));
        }
    }, [orderId]);

    useEffect(() => {
        setImageError(false);
    }, [orderId]);

    useEffect(() => {
        const fetchImage = async () => {
            if (orderData && orderData.rutaArchivo) {
                const url = await OrderService.getArchivoUrlVerificado(orderData.rutaArchivo);
                setImageUrl(url);
            } else {
                setImageUrl(null);
            }
        };

        fetchImage();
    }, [orderData]);

    const loadInitialData = async (id: number) => {
        setLoading(true);
        setLoadError(false);
        try {
            const [order, allProducts] = await Promise.all([
                OrderService.getOrdenById(id),
                CatalogService.getAllProductos()
            ]);

            let ordenActualizada = { ...order };

            if (order.idEstatusActual === 9) {
                try {
                    const userStr = localStorage.getItem('user');
                    const currentUserId = userStr ? JSON.parse(userStr).idUsuario : 1;

                    await OrderService.avanzarEstatus(id, {
                        idUsuario: currentUserId,
                        idEstatusDestino: 5,
                        clienteAprobo: true
                    });

                    ordenActualizada.idEstatusActual = 5;
                    toast.current?.show({
                        severity: 'info',
                        summary: 'Producción iniciada',
                        detail: 'La orden ha sido marcada como "En Impresión".',
                        life: 3000
                    });
                } catch (err) {
                    console.error('Error auto-avance a impresión', err);
                }
            }

            setOrderData(ordenActualizada);

            let enrichedItems: any[] = [];
            if (order.detalles && order.detalles.length > 0) {
                const productMap = new Map();
                allProducts.forEach((p: any) => productMap.set(String(p.idProducto), p));

                enrichedItems = order.detalles.map((detalle: any) => {
                    const p = productMap.get(String(detalle.idProducto));
                    return {
                        ...detalle,
                        nombreProducto: p?.descripcion || `Producto #${detalle.idProducto}`,
                        medidas: p?.formatoTamano || 'Estándar',
                        unidadVenta: p?.unidadVenta || 'Unidad'
                    };
                });
                setOrderItems(enrichedItems);
            }

            // Buscar datos del cliente y sobrantes existentes
            if (order.idCliente) {
                const client = await ClientService.getById(order.idCliente);
                setClientData(client);

                try {
                    const leftoversData = await SobranteService.getSobrantesPorCliente(order.idCliente);

                    if (leftoversData && leftoversData.content && leftoversData.content.length > 0) {
                        // Filtramos solo los sobrantes que coincidan con los productos de ESTA orden y tengan cantidad > 0
                        const relevantLeftovers = leftoversData.content.filter((leftover: any) =>
                            leftover.cantidadDisponible > 0 &&
                            enrichedItems.some(item => item.idProducto === leftover.producto.idProducto)
                        );

                        if (relevantLeftovers.length > 0) {
                            setExistingLeftovers(relevantLeftovers);
                            toast.current?.show({
                                severity: 'warn',
                                summary: 'Sobrantes disponibles',
                                detail: `El cliente tiene material sobrante para los productos de esta orden.`,
                                life: 5000
                            });
                        }
                    }
                } catch (error) {
                    console.error('Error al buscar sobrantes previos', error);
                }
            }
        } catch (error) {
            console.error('Error cargando datos', error);
            setLoadError(true);
            toast.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo cargar la orden.',
                life: 3000
            });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenConsumeDialog = (idSobrante: number, cantidadDisponible: number, productName: string) => {
        setConsumeData({ idSobrante, maxAmount: cantidadDisponible, productName });
        setShowConsumeDialog(true);
    };

    const processConsume = async (quantityToConsume: number) => {
        if (!consumeData) return;
        setIsConsuming(true);
        try {
            await SobranteService.consumirSobrante(consumeData.idSobrante, quantityToConsume);

            toast.current?.show({
                severity: 'success',
                summary: 'Inventario actualizado',
                detail: `Se descontaron ${quantityToConsume} unidades del inventario.`
            });

            setShowConsumeDialog(false);
            loadInitialData(Number(orderId)); // Recargamos para actualizar la alerta
        } catch (error: any) {
            toast.current?.show({ severity: 'error', summary: 'Error', detail: error.message || 'No se pudo consumir el sobrante.' });
        } finally {
            setIsConsuming(false);
        }
    };

    const processCompletion = async (hasLeftovers: boolean, leftoverQuantities: { [key: number]: number }) => {
        setIsSubmitting(true);
        try {
            if (hasLeftovers) {
                const leftoverPromises = orderItems.map(item => {
                    const qty = leftoverQuantities[item.idDetalle] || 0;
                    if (qty > 0) {
                        return SobranteService.registrarSobrante({
                            idCliente: orderData.idCliente,
                            idProducto: item.idProducto,
                            idOrden: Number(orderId),
                            cantidad: qty
                        });
                    }
                    return Promise.resolve();
                });

                await Promise.all(leftoverPromises);
            }

            const userStr = localStorage.getItem('user');
            const currentUserId = userStr ? JSON.parse(userStr).idUsuario : 1;

            await OrderService.avanzarEstatus(Number(orderId), {
                idUsuario: currentUserId,
                idEstatusDestino: 6,
                clienteAprobo: true
            });

            toast.current?.show({
                severity: 'success',
                summary: 'Orden Terminada',
                detail: `La orden #${orderId} está lista para entrega.`,
                life: 2000
            });

            setShowLeftoversDialog(false);

            setTimeout(() => {
                router.push('/workshoplist');
            }, 1500);

        } catch (error) {
            console.error(error);
            toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Ocurrió un problema al procesar la orden o los sobrantes.' });
            setIsSubmitting(false);
        }
    };

    const handleDownloadDesign = () => {
        downloadDesignFile({
            imageUrl,
            rutaArchivo: orderData?.rutaArchivo,
            fallbackFilename: `referencia-orden-${orderId}`,
            toastRef: toast
        });
    };

    const getStatusInfo = (status: number) => {
        if (status === 5) return { severity: 'warning', label: 'En impresión' };
        return { severity: 'secondary', label: `Estatus ${status}` };
    };

    const renderCantidadColumn = (rowData: any) => (
        <div className="flex flex-column align-items-center">
            <span className="font-bold text-lg text-900">{rowData.cantidad}</span>
        </div>
    );

    const renderMedidasColumn = (rowData: any) => (
        <span className="text-blue-600 font-bold">
            <i className="pi pi-arrows-h mr-1 text-sm"></i>
            {rowData.medidas}
        </span>
    );

    // --- ALERTA VISUAL DE SOBRANTES DISPONIBLES ---
    const renderLeftoversAlert = () => {
        if (existingLeftovers.length === 0) return null;

        return (
            <div className="col-12 mb-3">
                <div className="p-3 border-round bg-yellow-50 border-1 border-yellow-200 flex flex-column gap-2 shadow-1">
                    <div className="flex align-items-center gap-2 text-yellow-800 font-bold">
                        <i className="pi pi-exclamation-triangle"></i>
                        <span>¡Atención! Este cliente tiene inventario sobrante para productos de esta orden:</span>
                    </div>
                    <ul className="m-0 pl-4 text-yellow-900 text-sm">
                        {existingLeftovers.map(lo => {
                            // Buscamos el nombre del producto en los items de la orden actual para mostrarlo
                            const productName = orderItems.find(item => item.idProducto === lo.producto.idProducto)?.nombreProducto || `Producto ID #${lo.producto.idProducto}`;
                            return (
                                <li key={lo.idSobrante} className="mb-2">
                                    {productName}: <span className="font-bold">{lo.cantidadDisponible} unidades disponibles</span>
                                    <Button
                                        label="Consumir material"
                                        size="small"
                                        severity="warning"
                                        text
                                        className="ml-3 p-1 py-0 font-bold"
                                        onClick={() => handleOpenConsumeDialog(lo.idSobrante, lo.cantidadDisponible, productName)}
                                    />
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        );
    }

    const renderLoadingState = () => (
        <div className="flex justify-content-center align-items-center h-screen">
            <i className="pi pi-spin pi-spinner text-4xl"></i>
        </div>
    );

    const renderErrorState = () => (
        <div className="flex flex-column justify-content-center align-items-center h-screen gap-3 text-center px-4">
            <i className="pi pi-exclamation-triangle text-5xl text-orange-500"></i>
            <h2 className="m-0">No se pudo cargar la orden</h2>
            <p className="text-600 m-0">Verifica tu conexión e intenta nuevamente.</p>
            <Button
                label="Volver a la lista"
                icon="pi pi-arrow-left"
                onClick={() => router.push('/workshoplist')}
            />
        </div>
    );

    const statusInfo = getStatusInfo(orderData?.idEstatusActual ?? 0);

    const renderMainContent = () => (
        <div className="grid justify-content-center">
            <div className="col-12 md:col-10 lg:col-8">

                {/* --- HEADER --- */}
                <div className="flex align-items-center justify-content-between mb-4">
                    <div className="flex align-items-center gap-3">
                        <Link href="/workshoplist" passHref legacyBehavior>
                            <a className="p-button p-component p-button-text p-button-rounded p-button-icon-only">
                                <i className="pi pi-arrow-left text-xl"></i>
                            </a>
                        </Link>

                        <div>
                            <h1 className="m-0 text-3xl font-bold">Orden N° {orderId}</h1>
                            <span className="text-500">
                                Fecha de entrega:{' '}
                                {orderData.fechaEntregaFormal
                                    ? new Date(orderData.fechaEntregaFormal).toLocaleDateString()
                                    : 'Pendiente'}
                            </span>

                            <div className="mt-2">
                                <Tag
                                    severity={statusInfo.severity as any}
                                    value={statusInfo.label}
                                    className="text-sm px-3 py-1"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ALERTA DE INVENTARIO */}
                {renderLeftoversAlert()}

                {/* --- DETALLES DEL TRABAJO --- */}
                <Card title="Detalles de impresión" className="mb-4 shadow-2">
                    <div className="grid">
                        {/* COLUMNA IZQUIERDA: ESPECIFICACIONES */}
                        <div className="col-12 md:col-7 flex flex-column gap-3">
                            <div className="p-2 border-1 surface-border border-round bg-50">
                                <h3 className="text-lg font-bold m-0 mb-2 p-2 text-700">
                                    Productos requeridos
                                </h3>

                                <DataTable
                                    value={orderItems}
                                    size="small"
                                    responsiveLayout="scroll"
                                    className="p-datatable-sm"
                                    emptyMessage="Sin productos"
                                >
                                    <Column
                                        field="cantidad"
                                        header="Cant."
                                        style={{ width: '20%' }}
                                        body={renderCantidadColumn}
                                    />
                                    <Column
                                        field="nombreProducto"
                                        header="Producto"
                                        style={{ width: '40%' }}
                                    />
                                    <Column
                                        field="medidas"
                                        header="Medidas"
                                        style={{ width: '40%' }}
                                        body={renderMedidasColumn}
                                    />
                                </DataTable>
                            </div>

                            {/* INFO CLIENTE Y NOTAS */}
                            <div className="grid mt-2">
                                <div className="col-12 md:col-6">
                                    <label className="text-sm font-bold text-600 block mb-1">
                                        Cliente
                                    </label>
                                    <div className="p-2 surface-100 border-round font-medium text-overflow-ellipsis overflow-hidden white-space-nowrap">
                                        {clientData?.nombre || orderData.clienteNombre || 'Mostrador'}
                                    </div>
                                </div>

                                <div className="col-12 md:col-6">
                                    <label className="text-sm font-bold text-600 block mb-1">
                                        Contacto
                                    </label>
                                    <div className="p-2 surface-100 border-round font-medium">
                                        <i className="pi pi-phone text-green-600 mr-2"></i>
                                        {clientData?.telefono || 'N/A'}
                                    </div>
                                </div>

                                <div className="col-12">
                                    <label className="text-sm font-bold text-600 block mb-1">
                                        Notas de producción
                                    </label>
                                    <div className="p-3 bg-50 border-1 border-yellow-200 border-round text-700 font-italic">
                                        {orderData.notasDiseno || orderData.comentarios || 'Sin notas especiales'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* COLUMNA DERECHA: VISUALIZADOR DE ARCHIVO */}
                        <div className="col-12 md:col-5 flex flex-column pl-0 md:pl-4 mt-4 md:mt-0 border-top-1 md:border-top-none md:border-left-1 surface-border">
                            <label className="font-bold block mb-2 w-full text-center text-600">
                                Archivo de impresión
                            </label>

                            <div
                                className="flex align-items-center justify-content-center w-full p-2 surface-50 border-round-xl border-1 border-dashed surface-border relative"
                                style={{ minHeight: '300px' }}
                            >
                                {imageUrl && !imageError ? (
                                    <Image
                                        src={imageUrl}
                                        alt="Diseño Final"
                                        width="100%"
                                        preview
                                        className="shadow-2 border-round w-full block"
                                        imageStyle={{
                                            width: '100%',
                                            height: 'auto',
                                            maxHeight: '350px',
                                            objectFit: 'contain'
                                        }}
                                        onError={() => setImageError(true)}
                                    />
                                ) : (
                                    <div className="flex flex-column align-items-center justify-content-center text-gray-400">
                                        <i className="pi pi-image text-5xl mb-2"></i>
                                        <span className="text-sm text-center px-4">
                                            {imageError ? 'Archivo no encontrado (404)' : 'Sin archivo adjunto'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* BOTÓN DE DESCARGA */}
                            {imageUrl && (
                                <div className="mt-3 text-center">
                                    <Button
                                        type="button"
                                        label="Descargar diseño"
                                        icon="pi pi-download"
                                        className="p-button-sm p-button-outlined p-button-secondary"
                                        onClick={handleDownloadDesign}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* --- BOTÓN DE FINALIZACIÓN --- */}
                <Card className="shadow-4 border-top-3 border-green-500 bg-green-50">
                    <div className="flex flex-column md:flex-row align-items-center justify-content-between gap-4">
                        <div className="flex align-items-center gap-3">
                            <div className="border-circle bg-green-100 p-3 flex align-items-center justify-content-center">
                                <i className="pi pi-print text-2xl text-green-600"></i>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-green-900 m-0 mb-1">
                                    ¿La orden está lista?
                                </h2>
                                <p className="text-green-800 m-0 text-sm">
                                    Al terminar la impresión, marca la orden como lista.
                                </p>
                            </div>
                        </div>

                        <Button
                            label="Orden lista para entrega"
                            icon="pi pi-check-circle"
                            severity="success"
                            size="large"
                            className="w-full md:w-auto shadow-2"
                            onClick={() => setShowLeftoversDialog(true)}
                        />
                    </div>
                </Card>

                {/* DIALOG EXTERNO PARA SOBRANTES */}
                <LeftoversDialog
                    visible={showLeftoversDialog}
                    onHide={() => setShowLeftoversDialog(false)}
                    onConfirm={processCompletion}
                    orderItems={orderItems}
                    isSubmitting={isSubmitting}
                />

                {/* DIALOG PARA CONSUMIR SOBRANTES */}
                <ConsumeLeftoverDialog
                    visible={showConsumeDialog}
                    onHide={() => setShowConsumeDialog(false)}
                    onConfirm={processConsume}
                    isConsuming={isConsuming}
                    maxQuantity={consumeData?.maxAmount || 1}
                    productName={consumeData?.productName || ''}
                />

            </div>
        </div>
    );

    return (
        <>
            <Toast ref={toast} />
            {loading && renderLoadingState()}
            {!loading && (loadError || !orderData) && renderErrorState()}
            {!loading && !loadError && orderData && renderMainContent()}
        </>
    );
};

export default PrintOrderPage;