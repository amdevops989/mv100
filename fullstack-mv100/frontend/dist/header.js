// header.js
const navbarHTML = `
  <header class="navbar">
    <h2 class="logo"><a href="index.html">🛍️ Shop Demo</a></h2>
    <nav class="nav-links">
      <a href="auth.html">Auth</a>
      <a href="products.html">Products</a>
      <a href="cart.html">Cart</a>
      <a href="orders.html">Orders</a>
    </nav>
  </header>
  <hr/>
`;

document.body.insertAdjacentHTML("afterbegin", navbarHTML);
