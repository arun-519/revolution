import { auth } from '../auth.js';
import { getData, saveData } from '../data.js';
import { formatCurrency, formatDate, showNotification, debounce, checkLowStock, createSimpleChart } from '../utils.js';

export const farmerDashboard = {
  menuItems: [
    { id: 'dashboard', label: '📊 Dashboard', active: true },
    { id: 'my-products', label: '🌱 My Products' },
    { id: 'orders', label: '📦 Orders' },
    { id: 'analytics', label: '📈 Analytics' },
    { id: 'profile', label: '👤 Profile' }
  ],

  init() {
    this.renderMenu();
    this.showDashboard();
  },

  renderMenu() {
    const sidebar = document.querySelector('.sidebar-content');
    sidebar.innerHTML = this.menuItems.map(item => `
      <button class="menu-item ${item.active ? 'active' : ''}" data-section="${item.id}">
        ${item.label}
      </button>
    `).join('');

    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        document.querySelectorAll('.menu-item').forEach(mi => mi.classList.remove('active'));
        e.target.classList.add('active');
        
        const section = e.target.dataset.section;
        switch(section) {
          case 'dashboard': this.showDashboard(); break;
          case 'my-products': this.showMyProducts(); break;
          case 'orders': this.showOrders(); break;
          case 'analytics': this.showAnalytics(); break;
          case 'profile': this.showProfile(); break;
        }
      });
    });
  },

  showDashboard() {
    const data = getData();
    const farmerId = auth.getCurrentUser().id;
    const myProducts = data.products.filter(p => p.farmerId === farmerId);
    const myOrders = data.orders.filter(o => o.farmerId === farmerId);
    const lowStockAlerts = data.lowStockAlerts.filter(alert => alert.farmerId === farmerId);
    
    const totalRevenue = myOrders.reduce((sum, order) => sum + (order.orderSummary ? order.orderSummary.total : order.total), 0);
    const pendingOrders = myOrders.filter(o => o.status === 'pending').length;
    
    const content = `
      <div class="section-header">
        <h2 class="section-title">Farmer Dashboard</h2>
      </div>
      
      ${lowStockAlerts.length > 0 ? `
        <div class="alert-banner" style="background: #FEF3C7; border: 1px solid #F59E0B; color: #92400E; margin-bottom: 2rem; border-radius: 8px;">
          <h4>⚠️ Low Stock Alerts</h4>
          <div style="margin-top: 1rem;">
            ${lowStockAlerts.slice(0, 3).map(alert => `
              <div style="margin-bottom: 0.5rem; padding: 0.5rem; background: rgba(245, 158, 11, 0.1); border-radius: 4px;">
                <strong>${alert.productName}</strong>: Only ${alert.currentStock} units remaining (threshold: ${alert.threshold})
              </div>
            `).join('')}
            ${lowStockAlerts.length > 3 ? `<p style="margin-top: 0.5rem; font-style: italic;">...and ${lowStockAlerts.length - 3} more products</p>` : ''}
          </div>
        </div>
      ` : ''}
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${myProducts.length}</div>
          <div class="stat-label">Products Listed</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${myOrders.length}</div>
          <div class="stat-label">Total Orders</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${pendingOrders}</div>
          <div class="stat-label">Pending Orders</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${formatCurrency(totalRevenue)}</div>
          <div class="stat-label">Total Revenue</div>
        </div>
      </div>
      
      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Recent Orders</h3>
          </div>
          <div class="card-content">
            ${myOrders.slice(-5).reverse().map(order => `
              <div class="order-item">
                <div>
                  <strong>Order #${order.id}</strong>
                  <small style="color: var(--text-secondary); display: block;">
                    ${order.userName} • ${formatDate(order.orderDate)}
                  </small>
                </div>
                <div style="text-align: right;">
                  <div>${formatCurrency(order.orderSummary ? order.orderSummary.total : order.total)}</div>
                  <span class="badge badge-${order.status === 'delivered' ? 'success' : order.status === 'processing' ? 'warning' : 'primary'}">
                    ${order.status}
                  </span>
                </div>
              </div>
            `).join('') || '<p style="color: var(--text-secondary);">No orders yet</p>'}
          </div>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Low Stock Alert</h3>
          </div>
          <div class="card-content">
            ${myProducts.filter(p => p.stock <= (p.lowStockThreshold || 10)).map(product => `
              <div class="order-item">
                <div>
                  <strong>${product.name}</strong>
                  <small style="color: var(--text-secondary); display: block;">
                    Only ${product.stock} ${product.unit} remaining
                  </small>
                </div>
                <span class="badge badge-warning">Low Stock</span>
              </div>
            `).join('') || '<p style="color: var(--text-secondary);">All products have sufficient stock</p>'}
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('dashboard-content').innerHTML = content;
  },

  showMyProducts() {
    const data = getData();
    const farmerId = auth.getCurrentUser().id;
    const myProducts = data.products.filter(p => p.farmerId === farmerId);
    
    const content = `
      <div class="section-header">
        <h2 class="section-title">My Products</h2>
        <button class="btn-primary" onclick="farmerDashboard.showAddProductForm()">Add New Product</button>
      </div>
      
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${myProducts.map(product => `
              <tr>
                <td>
                  <div style="display: flex; align-items: center; gap: 1rem;">
                    <img src="${product.image}" alt="${product.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
                    <span style="display: none; font-size: 2rem;">🌱</span>
                    <div>
                      <strong>${product.name}</strong>
                      <small style="display: block; color: var(--text-secondary);">${product.description}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="badge badge-primary">${product.category}</span>
                  ${product.isOrganic ? '<span class="badge badge-success">Organic</span>' : ''}
                </td>
                <td><strong>${formatCurrency(product.price)}</strong><br><small>${product.unit}</small></td>
                <td>
                  <span class="${product.stock <= (product.lowStockThreshold || 10) ? 'badge badge-warning' : ''}">${product.stock}</span>
                </td>
                <td>
                  <span class="badge badge-${product.stock > 0 ? 'success' : 'danger'}">
                    ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                  </span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button class="btn-secondary btn-sm" onclick="farmerDashboard.editProduct(${product.id})">Edit</button>
                    <button class="btn-danger btn-sm" onclick="farmerDashboard.deleteProduct(${product.id})">Delete</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    document.getElementById('dashboard-content').innerHTML = content;
  },

  showAddProductForm() {
    const content = `
      <div class="section-header">
        <h2 class="section-title">Add New Product</h2>
        <button class="btn-secondary" onclick="farmerDashboard.showMyProducts()">Back to Products</button>
      </div>
      
      <div class="card">
        <form id="add-product-form">
          <div class="form-row">
            <div class="form-group">
              <label for="product-name">Product Name</label>
              <input type="text" id="product-name" required>
            </div>
            <div class="form-group">
              <label for="product-category">Category</label>
              <select id="product-category" required>
                <option value="">Select Category</option>
                <option value="vegetables">Vegetables</option>
                <option value="fruits">Fruits</option>
                <option value="dairy">Dairy</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="product-description">Description</label>
            <textarea id="product-description" rows="3" required></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="product-price">Price</label>
              <input type="number" id="product-price" step="0.01" required>
            </div>
            <div class="form-group">
              <label for="product-unit">Unit</label>
              <select id="product-unit" required>
                <option value="per lb">per lb</option>
                <option value="per dozen">per dozen</option>
                <option value="per head">per head</option>
                <option value="per bag">per bag</option>
                <option value="each">each</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="product-stock">Initial Stock</label>
              <input type="number" id="product-stock" required>
            </div>
            <div class="form-group">
              <label for="product-low-stock">Low Stock Threshold</label>
              <input type="number" id="product-low-stock" value="10" required>
            </div>
          </div>
          <div class="form-group">
            <label for="product-image">Product Image URL</label>
            <input type="url" id="product-image" placeholder="https://images.pexels.com/photos/...">
            <small style="color: var(--text-secondary);">Use Pexels or other image URLs. Leave empty for default icon.</small>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="product-organic"> Organic Product
            </label>
          </div>
          <button type="submit" class="btn-primary">Add Product</button>
        </form>
      </div>
    `;
    
    document.getElementById('dashboard-content').innerHTML = content;
    
    document.getElementById('add-product-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddProduct();
    });
  },

  handleAddProduct() {
    const data = getData();
    const farmer = auth.getCurrentUser();
    
    const newProduct = {
      id: Math.max(...data.products.map(p => p.id), 0) + 1,
      name: document.getElementById('product-name').value,
      description: document.getElementById('product-description').value,
      price: parseFloat(document.getElementById('product-price').value),
      unit: document.getElementById('product-unit').value,
      category: document.getElementById('product-category').value,
      farmerId: farmer.id,
      farmerName: farmer.farmName || farmer.name,
      stock: parseInt(document.getElementById('product-stock').value),
      lowStockThreshold: parseInt(document.getElementById('product-low-stock').value),
      image: document.getElementById('product-image').value || 'https://images.pexels.com/photos/1656663/pexels-photo-1656663.jpeg?auto=compress&cs=tinysrgb&w=400',
      isOrganic: document.getElementById('product-organic').checked,
      harvestDate: new Date().toISOString().split('T')[0],
      addedDate: new Date().toISOString()
    };
    
    data.products.push(newProduct);
    saveData(data);
    
    showNotification('Product added successfully');
    this.showMyProducts();
  },

  editProduct(productId) {
    const data = getData();
    const product = data.products.find(p => p.id === productId);
    
    if (!product) {
      showNotification('Product not found', 'error');
      return;
    }
    
    const content = `
      <div class="section-header">
        <h2 class="section-title">Edit Product</h2>
        <button class="btn-secondary" onclick="farmerDashboard.showMyProducts()">Back to Products</button>
      </div>
      
      <div class="card">
        <form id="edit-product-form">
          <div class="form-row">
            <div class="form-group">
              <label for="edit-product-name">Product Name</label>
              <input type="text" id="edit-product-name" value="${product.name}" required>
            </div>
            <div class="form-group">
              <label for="edit-product-category">Category</label>
              <select id="edit-product-category" required>
                <option value="vegetables" ${product.category === 'vegetables' ? 'selected' : ''}>Vegetables</option>
                <option value="fruits" ${product.category === 'fruits' ? 'selected' : ''}>Fruits</option>
                <option value="dairy" ${product.category === 'dairy' ? 'selected' : ''}>Dairy</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="edit-product-description">Description</label>
            <textarea id="edit-product-description" rows="3" required>${product.description}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="edit-product-price">Price</label>
              <input type="number" id="edit-product-price" step="0.01" value="${product.price}" required>
            </div>
            <div class="form-group">
              <label for="edit-product-unit">Unit</label>
              <select id="edit-product-unit" required>
                <option value="per lb" ${product.unit === 'per lb' ? 'selected' : ''}>per lb</option>
                <option value="per dozen" ${product.unit === 'per dozen' ? 'selected' : ''}>per dozen</option>
                <option value="per head" ${product.unit === 'per head' ? 'selected' : ''}>per head</option>
                <option value="per bag" ${product.unit === 'per bag' ? 'selected' : ''}>per bag</option>
                <option value="each" ${product.unit === 'each' ? 'selected' : ''}>each</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="edit-product-stock">Stock</label>
              <input type="number" id="edit-product-stock" value="${product.stock}" required>
            </div>
            <div class="form-group">
              <label for="edit-low-stock-threshold">Low Stock Alert Threshold</label>
              <input type="number" id="edit-low-stock-threshold" value="${product.lowStockThreshold || 10}" required>
            </div>
          </div>
          <div class="form-group">
            <label for="edit-product-image">Product Image URL</label>
            <input type="url" id="edit-product-image" value="${product.image}">
            <small style="color: var(--text-secondary);">Use Pexels or other image URLs</small>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="edit-product-organic" ${product.isOrganic ? 'checked' : ''}> Organic Product
            </label>
          </div>
          <button type="submit" class="btn-primary">Update Product</button>
        </form>
      </div>
    `;
    
    document.getElementById('dashboard-content').innerHTML = content;
    
    document.getElementById('edit-product-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleEditProduct(productId);
    });
  },

  handleEditProduct(productId) {
    const data = getData();
    const product = data.products.find(p => p.id === productId);
    
    if (product) {
      product.name = document.getElementById('edit-product-name').value;
      product.description = document.getElementById('edit-product-description').value;
      product.price = parseFloat(document.getElementById('edit-product-price').value);
      product.unit = document.getElementById('edit-product-unit').value;
      product.category = document.getElementById('edit-product-category').value;
      product.stock = parseInt(document.getElementById('edit-product-stock').value);
      product.image = document.getElementById('edit-product-image').value;
      product.lowStockThreshold = parseInt(document.getElementById('edit-low-stock-threshold').value);
      product.isOrganic = document.getElementById('edit-product-organic').checked;
      
      saveData(data);
      showNotification('Product updated successfully');
      this.showMyProducts();
    }
  },

  deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
      const data = getData();
      data.products = data.products.filter(p => p.id !== productId);
      saveData(data);
      showNotification('Product deleted successfully');
      this.showMyProducts();
    }
  },

  showOrders() {
    const data = getData();
    const farmerId = auth.getCurrentUser().id;
    const myOrders = data.orders.filter(o => o.farmerId === farmerId);
    
    const content = `
      <div class="section-header">
        <h2 class="section-title">Orders</h2>
      </div>
      
      ${myOrders.length === 0 ? 
        '<div class="empty-state"><h3>No orders yet</h3><p>Orders will appear here when customers purchase your products</p></div>' :
        myOrders.map(order => `
          <div class="order-card">
            <div class="order-header">
              <div>
                <div class="order-id">Order #${order.id}</div>
                <div class="order-date">From ${order.userName} • ${formatDate(order.orderDate)}</div>
              </div>
              <div>
                <span class="badge badge-${order.status === 'delivered' ? 'success' : order.status === 'processing' ? 'warning' : 'primary'}">
                  ${order.status.toUpperCase()}
                </span>
                <div style="margin-top: 0.5rem;">
                  <select onchange="farmerDashboard.updateOrderStatus(${order.id}, this.value)" style="padding: 0.25rem; border-radius: 4px; border: 1px solid var(--border-color);">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="order-items">
              ${order.items.map(item => `
                <div class="order-item">
                  <span>${item.name} (x${item.quantity})</span>
                  <span>${formatCurrency(item.price * item.quantity)}</span>
                </div>
              `).join('')}
            </div>
            ${order.orderSummary ? `
              <div class="order-summary" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                <div class="order-item">
                  <span>Subtotal:</span>
                  <span>${formatCurrency(order.orderSummary.subtotal)}</span>
                </div>
                <div class="order-item">
                  <span>Tax (8%):</span>
                  <span>${formatCurrency(order.orderSummary.tax)}</span>
                </div>
                <div class="order-item">
                  <span>Delivery Fee:</span>
                  <span>${formatCurrency(order.orderSummary.deliveryFee)}</span>
                </div>
              </div>
            ` : ''}
            <div class="order-total">
              <span>Total: ${formatCurrency(order.orderSummary ? order.orderSummary.total : order.total)}</span>
            </div>
            <div style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
              <div>Delivery Address: ${order.deliveryAddress}</div>
              <div>Expected Delivery: ${formatDate(order.deliveryDate)}</div>
            </div>
            ${order.farmerRating ? `
              <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                <div><strong>Customer Rating:</strong> ${'⭐'.repeat(order.farmerRating.rating)} (${order.farmerRating.rating}/5)</div>
                ${order.farmerRating.comment ? `<div style="font-style: italic; color: var(--text-secondary); margin-top: 0.5rem;">"${order.farmerRating.comment}"</div>` : ''}
              </div>
            ` : ''}
          </div>
        `).join('')
      }
    `;
    
    document.getElementById('dashboard-content').innerHTML = content;
  },

  updateOrderStatus(orderId, status) {
    const data = getData();
    // normalize types so matching works whether id is string or number
    const order = data.orders.find(o => String(o.id) === String(orderId));
    if (order) {
      order.status = status;
      saveData(data);
      showNotification(`Order #${orderId} status updated to ${status}`);
      this.showOrders();
    } else {
      console.error('Order not found when trying to update status:', orderId, data.orders);
      showNotification('Failed to update order status (order not found)', 'error');
    }
  },

  showAnalytics() {
    const data = getData();
    const farmerId = auth.getCurrentUser().id;
    const myOrders = data.orders.filter(o => o.farmerId === farmerId);
    const myProducts = data.products.filter(p => p.farmerId === farmerId);
    
    const totalRevenue = myOrders.reduce((sum, order) => sum + (order.orderSummary ? order.orderSummary.total : order.total), 0);
    const averageOrderValue = myOrders.length > 0 ? totalRevenue / myOrders.length : 0;
    
    // Calculate monthly sales
    const monthlySales = myOrders.reduce((acc, order) => {
      const month = new Date(order.orderDate).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      acc[month] = (acc[month] || 0) + (order.orderSummary ? order.orderSummary.total : order.total);
      return acc;
    }, {});
    
    // Calculate product performance
    const productSales = {};
    myOrders.forEach(order => {
      order.items.forEach(item => {
        if (!productSales[item.name]) productSales[item.name] = 0;
        productSales[item.name] += item.quantity;
      });
    });
    
    const content = `
      <div class="section-header">
        <h2 class="section-title">Analytics</h2>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${formatCurrency(totalRevenue)}</div>
          <div class="stat-label">Total Revenue</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${myOrders.length}</div>
          <div class="stat-label">Total Orders</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${formatCurrency(averageOrderValue)}</div>
          <div class="stat-label">Average Order</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${myProducts.reduce((sum, p) => sum + p.stock, 0)}</div>
          <div class="stat-label">Total Inventory</div>
        </div>
      </div>
      
      <div class="grid-2">
        <div class="chart-container">
          <h3 class="chart-title">Monthly Sales Revenue</h3>
          <div id="farmer-monthly-sales-chart"></div>
        </div>
        
        <div class="chart-container">
          <h3 class="chart-title">Product Sales Volume</h3>
          <div id="farmer-product-sales-chart"></div>
        </div>
      </div>
    `;
    
    document.getElementById('dashboard-content').innerHTML = content;
    
    // Create charts
    createSimpleChart('farmer-monthly-sales-chart', monthlySales);
    createSimpleChart('farmer-product-sales-chart', productSales);
  },

  showProfile() {
    const user = auth.getCurrentUser();
    
    const content = `
      <div class="section-header">
        <h2 class="section-title">Farm Profile</h2>
      </div>
      
      <div class="card">
        <form id="farmer-profile-form">
          <div class="form-row">
            <div class="form-group">
              <label for="farmer-name">Full Name</label>
              <input type="text" id="farmer-name" value="${user.name}" required>
            </div>
            <div class="form-group">
              <label for="farm-name">Farm Name</label>
              <input type="text" id="farm-name" value="${user.farmName || ''}" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="farmer-email">Email</label>
              <input type="email" id="farmer-email" value="${user.email}" required>
            </div>
            <div class="form-group">
              <label for="farmer-phone">Phone</label>
              <input type="tel" id="farmer-phone" value="${user.phone || ''}">
            </div>
          </div>
          <div class="form-group">
            <label for="farm-location">Farm Location</label>
            <input type="text" id="farm-location" value="${user.location || ''}">
          </div>
          <div class="form-group">
            <label for="farm-description">Farm Description</label>
            <textarea id="farm-description" rows="4" placeholder="Tell customers about your farm...">${user.description || ''}</textarea>
          </div>
          <button type="submit" class="btn-primary">Update Profile</button>
        </form>
      </div>
      
      ${user.ratings && user.ratings.length > 0 ? `
        <div class="card" style="margin-top: 2rem;">
          <div class="card-header">
            <h3 class="card-title">Customer Reviews</h3>
            <div>
              <span style="font-size: 1.5rem;">${'⭐'.repeat(Math.floor(user.rating || 0))}</span>
              <span style="font-weight: 600; margin-left: 0.5rem;">${(user.rating || 0).toFixed(1)}/5</span>
              <small style="color: var(--text-secondary); margin-left: 0.5rem;">(${user.totalRatings || 0} reviews)</small>
            </div>
          </div>
          <div class="card-content">
            ${user.ratings.slice(-5).reverse().map(rating => `
              <div class="order-item" style="align-items: flex-start;">
                <div>
                  <div style="margin-bottom: 0.5rem;">
                    <strong>${rating.userName}</strong>
                    <span style="margin-left: 1rem;">${'⭐'.repeat(rating.rating)}</span>
                  </div>
                  ${rating.comment ? `<p style="color: var(--text-secondary); font-style: italic; margin: 0;">"${rating.comment}"</p>` : ''}
                </div>
                <small style="color: var(--text-secondary);">${formatDate(rating.date)}</small>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
    
    document.getElementById('dashboard-content').innerHTML = content;
    
    document.getElementById('farmer-profile-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = getData();
      const user = data.users.find(u => u.id === auth.getCurrentUser().id);
      if (user) {
        user.name = document.getElementById('farmer-name').value;
        user.farmName = document.getElementById('farm-name').value;
        user.email = document.getElementById('farmer-email').value;
        user.phone = document.getElementById('farmer-phone').value;
        user.location = document.getElementById('farm-location').value;
        user.description = document.getElementById('farm-description').value;
        saveData(data);
        
        // Update current user in auth
        auth.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Update user name display
        document.getElementById('user-name').textContent = user.name;
      }
      showNotification('Profile updated successfully');
    });
  }
};

// Ensure farmerDashboard is available on window for inline event handlers
if (typeof window !== 'undefined') window.farmerDashboard = farmerDashboard;
