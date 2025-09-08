// Estado global de la aplicación
let productos = [];
let carrito = [];

// Elementos del DOM
const loadProductsBtn = document.getElementById('load-products');
const categoriaInput = document.getElementById('categoria');
const lineaAprobadaInput = document.getElementById('lineaAprobada');
const productsGrid = document.getElementById('products-grid');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error-message');
const cartCountElement = document.getElementById('cart-count');
const cartTotalElement = document.getElementById('cart-total');
const viewCartBtn = document.getElementById('view-cart-btn');
const cartModal = document.getElementById('cart-modal');
const closeCartBtn = document.getElementById('close-cart');
const cartItemsContainer = document.getElementById('cart-items');
const modalCartTotal = document.getElementById('modal-cart-total');
const clearCartBtn = document.getElementById('clear-cart');
const checkoutBtn = document.getElementById('checkout');

// URL de la API
const API_URL = 'https://g4vucvqjy3dkmlhfwulogss2aa0cbfcb.lambda-url.us-east-1.on.aws';

// Función para obtener un ID único y consistente del producto
function obtenerIdProducto(producto) {
    return producto.id || producto.idProducto || producto.codigo || producto.sku;
}

// Función para obtener parámetros de la URL
function obtenerParametrosURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        idCategoria: urlParams.get('idCategoria'),
        lineaAprobada: urlParams.get('lineaAprobada')
    };
}

// Función para inicializar parámetros desde la URL
function inicializarParametrosDesdeURL() {
    const params = obtenerParametrosURL();

    // Si hay parámetros en la URL, usarlos y ocultar el formulario
    if (params.idCategoria && params.lineaAprobada) {
        categoriaInput.value = params.idCategoria;
        lineaAprobadaInput.value = params.lineaAprobada;

        // Ocultar la sección de configuración
        const apiParamsSection = document.querySelector('.api-params');
        if (apiParamsSection) {
            apiParamsSection.style.display = 'none';
        }

        // Cargar productos automáticamente
        cargarProductos();
    }
}

// Función para enviar producto por WhatsApp
function enviarPorWhatsApp(idProducto) {
    const producto = productos.find(p => p.id === idProducto);

    if (!producto) {
        mostrarError('Producto no encontrado');
        return;
    }

    
    const nombre = producto.nombre || producto.nombre_producto || producto.descripcion || 'Producto sin nombre ---';
    const precio = producto.precio || producto.price || 0;

    // Crear el mensaje para WhatsApp
    const mensaje = `¡Hola! Me interesa este producto:

📦 Producto: ${nombre}
🆔 ID: ${idProducto}
💰 Precio: S./ ${formatearPrecio(precio)}

¿Podrías darme más información?`;

    // Codificar el mensaje para URL
    const mensajeCodificado = encodeURIComponent(mensaje);

    // URL de WhatsApp
    const urlWhatsApp = `https://api.whatsapp.com/send/?phone=+15551471282&text=${mensajeCodificado}&type=phone_number&app_absent=0`;

    // Abrir WhatsApp en una nueva ventana/pestaña
    window.open(urlWhatsApp, '_blank');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    loadProductsBtn.addEventListener('click', cargarProductos);
    viewCartBtn.addEventListener('click', mostrarCarrito);
    clearCartBtn.addEventListener('click', vaciarCarrito);
    checkoutBtn.addEventListener('click', procederPago);

    // Event listeners para cerrar el modal (múltiples métodos)
    closeCartBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        cerrarCarrito();
    });

    // Cerrar modal haciendo clic fuera de él
    cartModal.addEventListener('click', function(e) {
        if (e.target === cartModal) {
            cerrarCarrito();
        }
    });

    // Cerrar modal con tecla ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !cartModal.classList.contains('hidden')) {
            cerrarCarrito();
        }
    });

    // Cargar carrito desde localStorage
    cargarCarritoDesdeStorage();
    actualizarResumenCarrito();

    // Inicializar parámetros desde la URL
    inicializarParametrosDesdeURL();
});

// Función para cargar productos desde la API
async function cargarProductos() {
    const idCategoria = parseInt(categoriaInput.value);
    const lineaAprobada = parseInt(lineaAprobadaInput.value);

    if (!idCategoria || !lineaAprobada) {
        mostrarError('Por favor, completa todos los campos correctamente.');
        return;
    }

    mostrarCargando(true);
    ocultarError();

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                idCategoria: idCategoria,
                lineaAprobada: lineaAprobada
            })
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (Array.isArray(data)) {
            // Normalizar los productos para asegurar que tengan un ID único
            productos = data.map((producto, index) => {
                return {
                    ...producto,
                    // Asegurar que cada producto tenga un ID único consistente
                    id: obtenerIdProducto(producto) || `producto_${index}_${Date.now()}`
                };
            });
            mostrarProductos(productos);
        } else {
            throw new Error('La respuesta de la API no es válida');
        }

    } catch (error) {
        console.error('Error al cargar productos:', error);
        mostrarError(`Error al cargar productos: ${error.message}`);
    } finally {
        mostrarCargando(false);
    }
}

// Función para mostrar productos en la interfaz
function mostrarProductos(productos) {
    productsGrid.innerHTML = '';

    if (productos.length === 0) {
        productsGrid.innerHTML = '<p class="no-products">No se encontraron productos para los parámetros especificados.</p>';
        return;
    }

    productos.forEach(producto => {
        const productCard = crearTarjetaProducto(producto);
        productsGrid.appendChild(productCard);
    });
}

// Función para crear una tarjeta de producto
function crearTarjetaProducto(producto) {
    const card = document.createElement('div');
    card.className = 'product-card';

    // Obtener propiedades del producto de manera segura
    const nombre = producto.nombre_producto || producto.name || producto.descripcion || 'Producto sin nombre ***';
    const descripcion = producto.descripcion || producto.description || '';
    const precio = producto.precio || producto.price || 0;
    const id = producto.id; // Ahora usamos el ID ya normalizado

    card.innerHTML = `
        <div class="product-name">${nombre}</div>
        <div class="product-description">${descripcion}</div>
        <div class="product-price">S./ ${formatearPrecio(precio)}</div>
        <div class="product-actions">
            <div class="quantity-selector">
                <button class="quantity-btn" onclick="cambiarCantidad(this, -1)">-</button>
                <input type="number" class="quantity-input" value="1" min="1" max="99">
                <button class="quantity-btn" onclick="cambiarCantidad(this, 1)">+</button>
            </div>
            <div class="action-buttons">
                <button class="btn btn-whatsapp" onclick="enviarPorWhatsApp('${id}')" title="Consultar por WhatsApp">
                    <span class="whatsapp-icon">📱</span> Comprar
                </button>
            </div>
        </div>
    `;

    return card;
}

// Función para cambiar cantidad en el selector
function cambiarCantidad(btn, delta) {
    const input = btn.parentElement.querySelector('.quantity-input');
    let cantidad = parseInt(input.value) + delta;
    cantidad = Math.max(1, Math.min(99, cantidad));
    input.value = cantidad;
}

// Función para agregar producto al carrito
function agregarAlCarrito(idProducto, btn) {
    console.log('Buscando producto con ID:', idProducto);

    // Buscar el producto usando el ID normalizado
    const producto = productos.find(p => p.id === idProducto);

    console.log('Producto encontrado:', producto);
    console.log('Todos los productos:', productos);

    if (!producto) {
        mostrarError('Producto no encontrado');
        console.error('No se encontró el producto con ID:', idProducto);
        return;
    }

    const card = btn.closest('.product-card');
    const cantidad = parseInt(card.querySelector('.quantity-input').value);

    // Buscar si el producto ya está en el carrito
    const itemExistente = carrito.find(item => item.id === idProducto);

    if (itemExistente) {
        itemExistente.cantidad += cantidad;
    } else {
        carrito.push({
            id: idProducto,
            nombre: producto.nombre_producto || producto.name || producto.descripcion || 'Producto sin nombre33',
            precio: producto.precio || producto.price || 0,
            cantidad: cantidad
        });
    }

    guardarCarritoEnStorage();
    actualizarResumenCarrito();

    // Feedback visual
    btn.textContent = '¡Agregado!';
    btn.style.backgroundColor = '#28a745';
    setTimeout(() => {
        btn.textContent = 'Agregar al Carrito';
        btn.style.backgroundColor = '';
    }, 1000);
}

// Función para actualizar el resumen del carrito
function actualizarResumenCarrito() {
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const totalPrecio = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

    cartCountElement.textContent = totalItems;
    cartTotalElement.textContent = `S./ ${formatearPrecio(totalPrecio)}`;
}

// Función para mostrar el modal del carrito
function mostrarCarrito() {
    cartModal.classList.remove('hidden');
    cartModal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevenir scroll del body
    actualizarVistaCarrito();
}

// Función para cerrar el modal del carrito
function cerrarCarrito() {
    cartModal.classList.add('hidden');
    cartModal.style.display = 'none';
    document.body.style.overflow = ''; // Restaurar scroll del body
}

// Función para actualizar la vista del carrito en el modal
function actualizarVistaCarrito() {
    cartItemsContainer.innerHTML = '';

    if (carrito.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Tu carrito está vacío</p>';
        modalCartTotal.textContent = 'S./ 0';
        return;
    }

    carrito.forEach((item, index) => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">${item.nombre}</div>
                <div class="cart-item-price">S./ ${formatearPrecio(item.precio)} c/u</div>
            </div>
            <div class="cart-item-actions">
                <div class="quantity-selector">
                    <button class="quantity-btn" onclick="cambiarCantidadCarrito(${index}, -1)">-</button>
                    <input type="number" class="quantity-input" value="${item.cantidad}" min="1" max="99"
                           onchange="actualizarCantidadCarrito(${index}, this.value)">
                    <button class="quantity-btn" onclick="cambiarCantidadCarrito(${index}, 1)">+</button>
                </div>
                <button class="btn btn-danger" onclick="eliminarDelCarrito(${index})">Eliminar</button>
            </div>
        `;
        cartItemsContainer.appendChild(cartItem);
    });

    const totalPrecio = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    modalCartTotal.textContent = `S./ ${formatearPrecio(totalPrecio)}`;
}

// Función para cambiar cantidad en el carrito
function cambiarCantidadCarrito(index, delta) {
    carrito[index].cantidad = Math.max(1, carrito[index].cantidad + delta);
    guardarCarritoEnStorage();
    actualizarResumenCarrito();
    actualizarVistaCarrito();
}

// Función para actualizar cantidad desde el input
function actualizarCantidadCarrito(index, nuevaCantidad) {
    const cantidad = Math.max(1, parseInt(nuevaCantidad) || 1);
    carrito[index].cantidad = cantidad;
    guardarCarritoEnStorage();
    actualizarResumenCarrito();
    actualizarVistaCarrito();
}

// Función para eliminar producto del carrito
function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    guardarCarritoEnStorage();
    actualizarResumenCarrito();
    actualizarVistaCarrito();
}

// Función para vaciar todo el carrito
function vaciarCarrito() {
    if (carrito.length === 0) return;

    if (confirm('¿Estás seguro de que quieres vaciar el carrito?')) {
        carrito = [];
        guardarCarritoEnStorage();
        actualizarResumenCarrito();
        actualizarVistaCarrito();
    }
}

// Función para proceder al pago
function procederPago() {
    if (carrito.length === 0) {
        alert('Tu carrito está vacío');
        return;
    }

    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const resumen = carrito.map(item => `${item.nombre} x${item.cantidad}`).join('\n');

    alert(`¡Gracias por tu compra!\n\nResumen:\n${resumen}\n\nTotal: S./ ${formatearPrecio(total)}\n\nEn una aplicación real, aquí se procesaría el pago.`);

    // Vaciar carrito después del "pago"
    carrito = [];
    guardarCarritoEnStorage();
    actualizarResumenCarrito();

    // Asegurar que el modal se cierre
    setTimeout(() => {
        cerrarCarrito();
    }, 100);
}

// Funciones de utilidad para localStorage
function guardarCarritoEnStorage() {
    localStorage.setItem('carrito', JSON.stringify(carrito));
}

function cargarCarritoDesdeStorage() {
    const carritoGuardado = localStorage.getItem('carrito');
    if (carritoGuardado) {
        try {
            carrito = JSON.parse(carritoGuardado);
        } catch (error) {
            console.error('Error al cargar carrito desde localStorage:', error);
            carrito = [];
        }
    }
}

// Funciones de UI
function mostrarCargando(mostrar) {
    loadingElement.classList.toggle('hidden', !mostrar);
}

function mostrarError(mensaje) {
    errorElement.textContent = mensaje;
    errorElement.classList.remove('hidden');
}

function ocultarError() {
    errorElement.classList.add('hidden');
}

function formatearPrecio(precio) {
    return precio.toLocaleString('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
