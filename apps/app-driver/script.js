document.addEventListener('DOMContentLoaded', () => {
    
    // ===== VARIABLES GLOBALES =====
    let cart = [];
    let currentRestaurant = null;
    let currentSubcategory = 'Recomendados';
    let currentDishForOptions = null;
    let selectedOptions = [];
    let currentTip = 0;
    let vipServiceActive = false;
    const SHIPPING_COST = 5.00;
    let map = null;
    let marker = null;

    // ===== LÓGICA DEL CARRUSEL =====
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    let currentSlide = 0;
    const slideInterval = 5000;
    function goToSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        slides[index].classList.add('active');
        dots[index].classList.add('active');
        currentSlide = index;
    }
    function nextSlide() { let next = currentSlide + 1; if (next >= slides.length) next = 0; goToSlide(next); }
    let autoSlide = setInterval(nextSlide, slideInterval);
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => { clearInterval(autoSlide); goToSlide(index); autoSlide = setInterval(nextSlide, slideInterval); });
    });

    // ===== LÓGICA DEL MODAL DE BÚSQUEDA =====
    const openSearchBtn = document.getElementById('open-search');
    const closeSearchBtn = document.getElementById('close-search');
    const searchModal = document.getElementById('search-modal');
    openSearchBtn.addEventListener('click', () => { searchModal.classList.add('active'); setTimeout(() => document.getElementById('modal-input').focus(), 300); });
    closeSearchBtn.addEventListener('click', () => searchModal.classList.remove('active'));
    searchModal.addEventListener('click', (e) => { if (e.target === searchModal) searchModal.classList.remove('active'); });

    // ===== LÓGICA DEL MODO DÍA / NOCHE =====
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('i');
    const htmlElement = document.documentElement;
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        htmlElement.setAttribute('data-theme', 'light');
        themeIcon.classList.remove('fa-moon'); themeIcon.classList.add('fa-sun');
    }
    themeToggle.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        if (currentTheme === 'light') {
            htmlElement.removeAttribute('data-theme');
            themeIcon.classList.remove('fa-sun'); themeIcon.classList.add('fa-moon');
            localStorage.setItem('theme', 'dark');
        } else {
            htmlElement.setAttribute('data-theme', 'light');
            themeIcon.classList.remove('fa-moon'); themeIcon.classList.add('fa-sun');
            localStorage.setItem('theme', 'light');
        }
    });

    // ===== DATOS DE RESTAURANTES =====
    const restaurantsData = [
        {
            id: 1, name: "Pizza Nostra", category: "Pizzas", rating: 4.5, time: "15 - 25 min", price: "$2.50",
            image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=400&auto=format&fit=crop",
            subcategories: ["Recomendados", "Pizzas Clásicas", "Especiales", "Bebidas"],
            dishes: [
                { 
                    name: "Pizza Margarita", desc: "Salsa de tomate, mozzarella y albahaca", price: "$8.50", cat: "Pizzas Clásicas",
                    image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=400&auto=format&fit=crop",
                    options: { title: "Elige 2 sabores", required: 2, items: [{ name: "Margarita", price: 0 }, { name: "Pepperoni", price: 1 }, { name: "Hawaiana", price: 1 }, { name: "Cuatro Quesos", price: 2 }, { name: "Vegetariana", price: 1.5 }] }
                },
                { 
                    name: "Pizza Pepperoni", desc: "Doble pepperoni y queso extra", price: "$10.00", cat: "Pizzas Clásicas",
                    image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?q=80&w=400&auto=format&fit=crop",
                    options: { title: "Elige 2 sabores", required: 2, items: [{ name: "Pepperoni", price: 0 }, { name: "Margarita", price: 0 }, { name: "Hawaiana", price: 1 }, { name: "Cuatro Quesos", price: 2 }, { name: "Vegetariana", price: 1.5 }] }
                },
                { 
                    name: "Coca Cola 1.5L", desc: "Bebida helada", price: "$3.00", cat: "Bebidas",
                    image: "https://images.unsplash.com/photo-1554866585-cd94860890b7?q=80&w=400&auto=format&fit=crop",
                    options: { title: "Elige 1 refresco", required: 1, items: [{ name: "Coca Cola", price: 0 }, { name: "Sprite", price: 0 }, { name: "Fanta", price: 0 }, { name: "Inca Kola", price: 0.5 }] }
                }
            ]
        },
        {
            id: 2, name: "Burger King", category: "Hamburguesas", rating: 4.8, time: "10 - 20 min", price: "$3.00",
            image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=400&auto=format&fit=crop",
            subcategories: ["Recomendados", "Hamburguesas", "Combos", "Postres"],
            dishes: [
                { 
                    name: "Whopper", desc: "Carne a la parrilla, tomate, lechuga y mayonesa", price: "$7.50", cat: "Hamburguesas",
                    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=400&auto=format&fit=crop"
                },
                { 
                    name: "Combo Whopper", desc: "Whopper + Papas + Bebida", price: "$11.00", cat: "Combos",
                    image: "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?q=80&w=400&auto=format&fit=crop",
                    options: { title: "Elige 1 refresco", required: 1, items: [{ name: "Coca Cola", price: 0 }, { name: "Sprite", price: 0 }, { name: "Fanta", price: 0 }, { name: "Agua", price: 0 }] }
                },
                { 
                    name: "Sundae de Chocolate", desc: "Helado suave con salsa de chocolate", price: "$3.50", cat: "Postres",
                    image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=400&auto=format&fit=crop"
                }
            ]
        },
        {
            id: 3, name: "Sushi Master", category: "Sushi", rating: 4.7, time: "20 - 30 min", price: "$4.00",
            image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=400&auto=format&fit=crop",
            subcategories: ["Recomendados", "Rollos", "Nigiris", "Bebidas"],
            dishes: [
                { 
                    name: "California Roll", desc: "Cangrejo, palta y pepino", price: "$8.00", cat: "Rollos",
                    image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?q=80&w=400&auto=format&fit=crop"
                },
                { 
                    name: "Dragon Roll", desc: "Camarón tempura, palta y salsa anguila", price: "$14.00", cat: "Rollos",
                    image: "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?q=80&w=400&auto=format&fit=crop"
                },
                { 
                    name: "Nigiri de Salmón", desc: "2 piezas de salmón fresco", price: "$6.00", cat: "Nigiris",
                    image: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?q=80&w=400&auto=format&fit=crop"
                },
                { 
                    name: "Té Verde Helado", desc: "Bebida refrescante", price: "$2.50", cat: "Bebidas",
                    image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=400&auto=format&fit=crop",
                    options: { title: "Elige 1 bebida", required: 1, items: [{ name: "Té Verde", price: 0 }, { name: "Té Negro", price: 0 }, { name: "Agua Mineral", price: 0 }, { name: "Jugo de Naranja", price: 1 }] }
                }
            ]
        },
        {
            id: 4, name: "Pollo Frito Loco", category: "Pollo", rating: 4.4, time: "15 - 25 min", price: "$2.00",
            image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=400&auto=format&fit=crop",
            subcategories: ["Recomendados", "Pollo Frito", "Alitas", "Combos"],
            dishes: [
                { 
                    name: "Pollo Frito 1/4", desc: "Presa de pollo crujiente con papas", price: "$6.50", cat: "Pollo Frito",
                    image: "https://images.unsplash.com/photo-1562967914-608f82629710?q=80&w=400&auto=format&fit=crop"
                },
                { 
                    name: "Alitas BBQ (6 pzs)", desc: "Alitas bañadas en salsa BBQ", price: "$8.50", cat: "Alitas",
                    image: "https://images.unsplash.com/photo-1608039755401-742074f0548d?q=80&w=400&auto=format&fit=crop",
                    options: { title: "Elige 3 sabores", required: 3, items: [{ name: "BBQ", price: 0 }, { name: "Buffalo", price: 0 }, { name: "Miel Mostaza", price: 0 }, { name: "Limón y Pimienta", price: 0 }, { name: "Picante", price: 0.5 }] }
                },
                { 
                    name: "Combo Familiar", desc: "1 Pollo entero + Papas grandes + Ensalada", price: "$22.00", cat: "Combos",
                    image: "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?q=80&w=400&auto=format&fit=crop"
                }
            ]
        },
        {
            id: 5, name: "Dulce Tentación", category: "Postres", rating: 4.9, time: "10 - 15 min", price: "$2.80",
            image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?q=80&w=400&auto=format&fit=crop",
            subcategories: ["Recomendados", "Pasteles", "Helados", "Cafés"],
            dishes: [
                { 
                    name: "Torta de Chocolate", desc: "Porción de torta húmeda de chocolate", price: "$5.00", cat: "Pasteles",
                    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=400&auto=format&fit=crop"
                },
                { 
                    name: "Cheesecake de Fresa", desc: "Base de galleta y coulis de fresa", price: "$6.00", cat: "Pasteles",
                    image: "https://images.unsplash.com/photo-1533134242453-ee1a69e12a8f?q=80&w=400&auto=format&fit=crop"
                },
                { 
                    name: "Copa de Helado", desc: "3 bolas de helado a elección", price: "$4.50", cat: "Helados",
                    image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=400&auto=format&fit=crop"
                },
                { 
                    name: "Café Latte", desc: "Café espresso con leche vaporizada", price: "$3.00", cat: "Cafés",
                    image: "https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=400&auto=format&fit=crop"
                }
            ]
        },
        {
            id: 6, name: "Tacos El Primo", category: "Hamburguesas", rating: 4.6, time: "12 - 22 min", price: "$2.20",
            image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=400&auto=format&fit=crop",
            subcategories: ["Recomendados", "Tacos", "Quesadillas", "Salsas"],
            dishes: [
                { 
                    name: "Taco de Carne Asada", desc: "Carne, cebolla, cilantro y limón", price: "$3.00", cat: "Tacos",
                    image: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?q=80&w=400&auto=format&fit=crop"
                },
                { 
                    name: "Taco de Pastor", desc: "Cerdo adobado con piña", price: "$3.00", cat: "Tacos",
                    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=400&auto=format&fit=crop"
                },
                { 
                    name: "Quesadilla de Pollo", desc: "Tortilla de harina, queso y pollo", price: "$5.50", cat: "Quesadillas",
                    image: "https://images.unsplash.com/photo-1618040996337-56904b7850b9?q=80&w=400&auto=format&fit=crop"
                },
                { 
                    name: "Salsa Picante Extra", desc: "Porción de salsa habanera", price: "$1.00", cat: "Salsas",
                    image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?q=80&w=400&auto=format&fit=crop"
                }
            ]
        }
    ];

    // ===== RENDERIZAR RESTAURANTES (Imagen completa) =====
    const restaurantsGrid = document.getElementById('restaurants-grid');
    function renderRestaurants() {
        restaurantsGrid.innerHTML = '';
        restaurantsData.forEach(rest => {
            const card = document.createElement('div');
            card.classList.add('restaurant-card');
            card.style.backgroundImage = `url('${rest.image}')`;
            card.innerHTML = `
                <div class="restaurant-card-overlay"></div>
                <div class="restaurant-card-info">
                    <h3>${rest.name}</h3>
                    <div class="restaurant-rating">
                        <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star-half-alt"></i>
                    </div>
                    <div class="restaurant-meta">
                        <span><i class="far fa-clock"></i> ${rest.time}</span>
                        <span class="restaurant-price">${rest.price}</span>
                    </div>
                </div>
            `;
            card.addEventListener('click', () => openRestaurant(rest));
            restaurantsGrid.appendChild(card);
        });
    }
    renderRestaurants();

    // ===== LÓGICA DE VISTA DE DETALLE =====
    const mainView = document.getElementById('main-view');
    const restaurantView = document.getElementById('restaurant-view');
    const restaurantTitle = document.getElementById('restaurant-title');
    const subcategoriesTabs = document.getElementById('subcategories-tabs');
    const dishesList = document.getElementById('dishes-list');
    const backBtn = document.getElementById('back-to-home');

    function openRestaurant(rest) {
        currentRestaurant = rest;
        currentSubcategory = rest.subcategories[0];
        restaurantTitle.textContent = rest.name;
        mainView.classList.add('hidden');
        restaurantView.classList.remove('hidden');
        renderSubcategories();
        renderDishes();
        window.scrollTo(0, 0);
    }

    function renderSubcategories() {
        subcategoriesTabs.innerHTML = '';
        currentRestaurant.subcategories.forEach(sub => {
            const dishCount = currentRestaurant.dishes.filter(d => d.cat === sub).length;
            const tab = document.createElement('button');
            tab.classList.add('subcategory-tab');
            if (sub === currentSubcategory) tab.classList.add('active');
            tab.innerHTML = `${sub} ${sub === currentSubcategory ? `<span class="tab-count">${dishCount}</span>` : ''}`;
            tab.addEventListener('click', () => { currentSubcategory = sub; renderSubcategories(); renderDishes(); });
            subcategoriesTabs.appendChild(tab);
        });
    }

    function renderDishes() {
        dishesList.innerHTML = '';
        const filteredDishes = currentRestaurant.dishes.filter(dish => dish.cat === currentSubcategory);
        
        if (filteredDishes.length === 0) {
            dishesList.innerHTML = '<p style="color: var(--color-gris-texto); grid-column: 1/-1; text-align: center;">No hay platos en esta categoría.</p>';
            return;
        }

        filteredDishes.forEach(dish => {
            const cartItem = cart.find(item => item.name === dish.name && item.restaurant === currentRestaurant.name);
            const isAdded = cartItem ? true : false;
            const currentQty = cartItem ? cartItem.qty : 0;

            const card = document.createElement('div');
            card.classList.add('dish-card');
            card.style.backgroundImage = `url('${dish.image}')`;
            
            // Contenido de la tarjeta (común para web y móvil)
            let bottomContent = '';
            if (!isAdded) {
                bottomContent = `<button class="btn-add-web" id="add-${dish.name.replace(/\s/g, '')}">+ Agregar</button>`;
            } else {
                bottomContent = `
                    <div class="web-controls">
                        <div class="web-qty-control">
                            <button class="web-qty-btn minus" data-name="${dish.name}"><i class="fas fa-minus"></i></button>
                            <span class="web-qty-value">${currentQty}</span>
                            <button class="web-qty-btn plus" data-name="${dish.name}"><i class="fas fa-plus"></i></button>
                        </div>
                        <button class="btn-remove-web" data-name="${dish.name}"><i class="fas fa-times"></i></button>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="dish-card-overlay"></div>
                <div class="dish-card-content">
                    <span class="dish-card-category">${dish.cat}</span>
                    <h4>${dish.name}</h4>
                    <p>${dish.desc}</p>
                    <div class="dish-card-bottom">
                        <span class="dish-card-price">${dish.price}</span>
                        <div id="controls-${dish.name.replace(/\s/g, '')}">
                            ${bottomContent}
                        </div>
                    </div>
                </div>
            `;
            
            // Lógica de agregar
            const addBtn = card.querySelector(`#add-${dish.name.replace(/\s/g, '')}`);
            if (addBtn) {
                addBtn.addEventListener('click', () => {
                    if (dish.options) {
                        openOptionsModal(dish, 1);
                    } else {
                        addToCart(dish, 1, []);
                        renderDishes();
                    }
                });
            }

            // Lógica de controles de cantidad y eliminar
            const minusBtn = card.querySelector('.minus');
            const plusBtn = card.querySelector('.plus');
            const removeBtn = card.querySelector('.btn-remove-web');

            if (minusBtn) {
                minusBtn.addEventListener('click', () => {
                    if (currentQty > 1) {
                        updateCartQuantity(dish, currentQty - 1);
                        renderDishes();
                        renderCartModal();
                    } else {
                        removeFromCart(dish);
                        renderDishes();
                        renderCartModal();
                    }
                });
            }
            if (plusBtn) {
                plusBtn.addEventListener('click', () => {
                    updateCartQuantity(dish, currentQty + 1);
                    renderDishes();
                    renderCartModal();
                });
            }
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    removeFromCart(dish);
                    renderDishes();
                    renderCartModal();
                });
            }

            dishesList.appendChild(card);
        });
    }

    backBtn.addEventListener('click', () => {
        restaurantView.classList.add('hidden');
        mainView.classList.remove('hidden');
        window.scrollTo(0, 0);
    });

    // ===== LÓGICA DEL MODAL DE OPCIONES =====
    const optionsModal = document.getElementById('options-modal');
    const optionsTitle = document.getElementById('options-title');
    const optionsInstruction = document.getElementById('options-instruction');
    const optionsList = document.getElementById('options-list');
    const confirmOptionsBtn = document.getElementById('confirm-options');
    const closeOptionsBtn = document.getElementById('close-options');

    function openOptionsModal(dish, qty) {
        currentDishForOptions = { dish, qty };
        selectedOptions = [];
        optionsTitle.textContent = dish.name;
        optionsInstruction.textContent = `${dish.options.title} (Obligatorio: ${dish.options.required})`;
        optionsList.innerHTML = '';
        dish.options.items.forEach((item, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.classList.add('option-item');
            optionDiv.innerHTML = `
                <label>
                    <input type="checkbox" value="${index}" data-name="${item.name}" data-price="${item.price}">
                    <span class="option-name">${item.name}</span>
                </label>
                <span class="option-price">${item.price > 0 ? '+$' + item.price.toFixed(2) : 'Gratis'}</span>
            `;
            const checkbox = optionDiv.querySelector('input');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    if (selectedOptions.length >= dish.options.required) { e.target.checked = false; return; }
                    selectedOptions.push({ name: item.name, price: item.price });
                } else {
                    selectedOptions = selectedOptions.filter(opt => opt.name !== item.name);
                }
                validateOptions();
            });
            optionsList.appendChild(optionDiv);
        });
        validateOptions();
        optionsModal.classList.add('active');
    }

    function validateOptions() {
        const required = currentDishForOptions.dish.options.required;
        if (selectedOptions.length === required) {
            confirmOptionsBtn.disabled = false;
            confirmOptionsBtn.textContent = `Confirmar (${selectedOptions.length}/${required})`;
        } else {
            confirmOptionsBtn.disabled = true;
            confirmOptionsBtn.textContent = `Selecciona ${required} opciones (${selectedOptions.length}/${required})`;
        }
    }

    confirmOptionsBtn.addEventListener('click', () => {
        if (selectedOptions.length === currentDishForOptions.dish.options.required) {
            addToCart(currentDishForOptions.dish, currentDishForOptions.qty, selectedOptions);
            optionsModal.classList.remove('active');
            renderDishes();
            renderCartModal();
        }
    });

    closeOptionsBtn.addEventListener('click', () => optionsModal.classList.remove('active'));
    optionsModal.addEventListener('click', (e) => { if (e.target === optionsModal) optionsModal.classList.remove('active'); });

    // ===== LÓGICA DEL CARRITO =====
    function addToCart(dish, qty, options) {
        const existingItemIndex = cart.findIndex(item => 
            item.name === dish.name && 
            item.restaurant === currentRestaurant.name &&
            JSON.stringify(item.options) === JSON.stringify(options)
        );
        if (existingItemIndex !== -1) {
            cart[existingItemIndex].qty += qty;
        } else {
            cart.push({
                name: dish.name,
                price: dish.price,
                restaurant: currentRestaurant.name,
                qty: qty,
                options: options,
                image: dish.image
            });
        }
        updateCartCount();
    }

    function updateCartQuantity(dish, newQty) {
        const itemIndex = cart.findIndex(item => 
            item.name === dish.name && 
            item.restaurant === currentRestaurant.name
        );
        if (itemIndex !== -1) {
            cart[itemIndex].qty = newQty;
            updateCartCount();
        }
    }

    function removeFromCart(dish) {
        cart = cart.filter(item => 
            !(item.name === dish.name && item.restaurant === currentRestaurant.name)
        );
        updateCartCount();
    }

    function updateCartCount() {
        const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
        document.getElementById('cart-count').textContent = totalItems;
    }

    // ===== LÓGICA DEL PANEL LATERAL DE MI PEDIDO =====
    const openCartBtn = document.getElementById('open-cart');
    const closeCartBtn = document.getElementById('close-cart');
    const cartPanel = document.getElementById('cart-panel');
    const cartItemsContainer = document.getElementById('cart-items');

    openCartBtn.addEventListener('click', () => {
        renderCartModal();
        cartPanel.classList.add('active');
        setTimeout(initMap, 300); // Inicializar mapa cuando el panel esté visible
    });
    closeCartBtn.addEventListener('click', () => cartPanel.classList.remove('active'));
    cartPanel.addEventListener('click', (e) => { if (e.target === cartPanel) cartPanel.classList.remove('active'); });

    // Propina
    const tipButtons = document.querySelectorAll('.tip-btn');
    tipButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tipButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tipValue = btn.dataset.tip;
            if (tipValue === 'custom') {
                const custom = prompt('Ingresa el monto de propina:');
                currentTip = custom ? parseFloat(custom) : 0;
            } else {
                currentTip = parseFloat(tipValue);
            }
            updateCartSummary();
        });
    });

    // Servicio VIP
    const vipCheckbox = document.getElementById('vip-service');
    vipCheckbox.addEventListener('change', (e) => {
        vipServiceActive = e.target.checked;
        updateCartSummary();
    });

    function renderCartModal() {
        cartItemsContainer.innerHTML = '';
        
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p style="text-align: center; color: var(--color-gris-texto); padding: 2rem 0;">Tu carrito está vacío.</p>';
            updateCartSummary();
            return;
        }

        const grouped = {};
        cart.forEach(item => {
            if (!grouped[item.restaurant]) grouped[item.restaurant] = [];
            grouped[item.restaurant].push(item);
        });

        for (const [restaurant, items] of Object.entries(grouped)) {
            const groupDiv = document.createElement('div');
            groupDiv.classList.add('cart-restaurant-group');
            
            const restaurantDelivery = 5.00;
            
            groupDiv.innerHTML = `
                <div class="cart-restaurant-header">
                    <h4>${restaurant}</h4>
                    <span>Delivery: $${restaurantDelivery.toFixed(2)}</span>
                </div>
            `;
            
            items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('cart-item');
                itemDiv.innerHTML = `
                    <div class="cart-item-img" style="background-image: url('${item.image}');"></div>
                    <div class="cart-item-info">
                        <h5>${item.name}</h5>
                        <p>$${parseFloat(item.price.replace('$', '')).toFixed(2)} c/u</p>
                        ${item.options.length > 0 ? `<p style="font-size:0.65rem; color: var(--color-verde-neon);">${item.options.map(o => o.name).join(', ')}</p>` : ''}
                    </div>
                    <div class="cart-item-controls">
                        <div class="cart-qty-control">
                            <button class="cart-qty-btn minus"><i class="fas fa-minus"></i></button>
                            <span class="cart-qty-value">${item.qty}</span>
                            <button class="cart-qty-btn plus"><i class="fas fa-plus"></i></button>
                        </div>
                        <button class="cart-remove-btn"><i class="fas fa-times"></i></button>
                    </div>
                `;
                
                const minusBtn = itemDiv.querySelector('.minus');
                const plusBtn = itemDiv.querySelector('.plus');
                const qtyValue = itemDiv.querySelector('.cart-qty-value');
                const removeBtn = itemDiv.querySelector('.cart-remove-btn');
                
                minusBtn.addEventListener('click', () => {
                    if (item.qty > 1) {
                        item.qty -= 1;
                        qtyValue.textContent = item.qty;
                        updateCartCount();
                        renderCartModal();
                        updateCartSummary();
                    } else {
                        removeFromCartByItem(item);
                        renderCartModal();
                        updateCartSummary();
                        renderDishes();
                    }
                });
                
                plusBtn.addEventListener('click', () => {
                    item.qty += 1;
                    qtyValue.textContent = item.qty;
                    updateCartCount();
                    renderCartModal();
                    updateCartSummary();
                });
                
                removeBtn.addEventListener('click', () => {
                    removeFromCartByItem(item);
                    renderCartModal();
                    updateCartSummary();
                    renderDishes();
                });
                
                groupDiv.appendChild(itemDiv);
            });
            
            cartItemsContainer.appendChild(groupDiv);
        }

        updateCartSummary();
    }

    function removeFromCartByItem(item) {
        const index = cart.indexOf(item);
        if (index > -1) {
            cart.splice(index, 1);
            updateCartCount();
        }
    }

    function updateCartSummary() {
        let subtotal = 0;
        cart.forEach(item => {
            const price = parseFloat(item.price.replace('$', ''));
            subtotal += price * item.qty;
        });

        const uniqueRestaurants = [...new Set(cart.map(item => item.restaurant))];
        let shipping = uniqueRestaurants.length * SHIPPING_COST;

        let vipCost = vipServiceActive ? 2.50 : 0;

        const total = subtotal + shipping + vipCost + currentTip;

        document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('shipping-cost').textContent = `$${shipping.toFixed(2)}`;
        document.getElementById('total').textContent = `$${total.toFixed(2)}`;
    }

    // Realizar pedido
    document.getElementById('place-order').addEventListener('click', () => {
        if (cart.length === 0) {
            alert('Tu carrito está vacío. Agrega algunos platos primero.');
            return;
        }
        alert('¡Pedido realizado con éxito! 🎉\nTotal: ' + document.getElementById('total').textContent);
        cart = [];
        updateCartCount();
        renderCartModal();
        cartPanel.classList.remove('active');
        if (!restaurantView.classList.contains('hidden')) renderDishes();
    });

    // ===== LÓGICA DEL MAPA (Leaflet) =====
    function initMap() {
        const mapContainer = document.getElementById('map-container');
        if (!mapContainer) return;

        // Si ya existe un mapa, no reinicializar
        if (map) {
            setTimeout(() => map.invalidateSize(), 100);
            return;
        }

        // Coordenadas iniciales (Pucallpa, Perú - según tu footer)
        const initialCoords = [-8.3791, -74.5539];
        
        map = L.map('map-container').setView(initialCoords, 14);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        // Marcador arrastrable
        marker = L.marker(initialCoords, { draggable: true }).addTo(map);
        
        marker.on('dragend', function(e) {
            const position = marker.getLatLng();
            reverseGeocode(position.lat, position.lng);
        });

        // Buscar dirección
        document.getElementById('search-address-btn').addEventListener('click', () => {
            const query = document.getElementById('address-input').value;
            if (query) geocodeAddress(query);
        });

        // Usar ubicación actual
        document.getElementById('current-location-btn').addEventListener('click', () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        map.setView([latitude, longitude], 16);
                        marker.setLatLng([latitude, longitude]);
                        reverseGeocode(latitude, longitude);
                    },
                    () => alert('No se pudo obtener tu ubicación. Verifica los permisos.')
                );
            } else {
                alert('Tu navegador no soporta geolocalización.');
            }
        });
    }

    function geocodeAddress(query) {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.length > 0) {
                    const { lat, lon, display_name } = data[0];
                    const newCoords = [parseFloat(lat), parseFloat(lon)];
                    map.setView(newCoords, 16);
                    marker.setLatLng(newCoords);
                    document.getElementById('display-address').textContent = display_name;
                } else {
                    alert('No se encontró la dirección. Intenta con otra.');
                }
            })
            .catch(() => alert('Error al buscar la dirección.'));
    }

    function reverseGeocode(lat, lng) {
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.display_name) {
                    document.getElementById('display-address').textContent = data.display_name;
                }
            })
            .catch(() => console.log('Error al obtener la dirección.'));
    }

});