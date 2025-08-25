🌍 Wandervise in EJS


📋 Overview

Wandervise is a full-stack travel agency platform built with Node.js, Express, MongoDB, and EJS. It provides a robust admin dashboard for managing travel packages, products, bookings, and user interactions, alongside client-facing pages for browsing destinations, packages, products, blogs, and careers. The application supports user authentication, Stripe payment integration, coupon management, and a responsive UI. Key functionalities include package and product bookings, blog commenting, career applications, FAQ management, contact enquiries, and admin/agent controls for content and user management.



✨  Features

🏢 Admin Dashboard: The admin dashboard displays key metrics such as Active Agents, Total Users, Product Earnings, and Package Earnings, providing a comprehensive overview of platform activity. It lists recent bookings for both packages and products, contact enquiries, FAQs, packages, and products, enabling efficient management. The dashboard supports admin and agent roles with session and cookie based authentication for secure access control.

👤 User Management: Administrators can create, edit, and delete user accounts through the dashboard, streamlining user management tasks. The platform allows viewing detailed user profiles, including booking history and personal details, to facilitate effective oversight and support.

🗺️ Package Management: The platform supports full CRUD operations for tour packages, including detailed itinerary creation and preview functionality for admins and agents. Clients can browse package lists, view detailed package information, and explore offer pages with filtering options to find suitable travel options.

🛒 Product Management: A dedicated shop section enables admins and agents to perform CRUD operations for products, including listing, adding, editing, deleting, and viewing detailed product pages. Clients can explore a product showcase, add items to a cart, proceed through checkout, and confirm orders, with support for filters, coupons, and discounts.

📅 Booking Management: The system facilitates package and product bookings with integrated Stripe payment processing and refund capabilities. Clients can view their booking lists and details, while admins and agents can manage booking lists, update statuses (confirmed, pending), and delete entries as needed.

🎟️ Coupon System: Administrators can create, manage, and apply coupons to package and product bookings, supporting both percentage and fixed discounts. The system includes features for setting usage limits and expiry dates to control coupon availability.

📝 Blog Section: Admins have tools to add, edit, delete, and list blog posts, enabling dynamic content management. Clients can access blog lists, view detailed posts, and submit comments to engage with the platform’s content.

💼 Career Module: The career module supports listing, detailing, and performing CRUD operations for job postings, utilizing the Jodit editor for rich text formatting. Clients can submit applications, which admins and agents can review and manage efficiently.

❓ FAQ Management: The platform allows storing and answering user-submitted questions, with functionality to add or delete FAQs. An admin enquiry page provides a centralized interface for managing all FAQ-related activities.

📧 Contact Enquiries: Clients can submit enquiries through a dedicated contact form. Admins and agents can manage these enquiries, updating their status (pending, active, cancel) to ensure timely responses.

🖼️ Gallery Module: The gallery module supports CRUD operations for managing images, allowing admins to curate visual content. Clients can view a gallery page showcasing these images.

🧭 Tour Guide Module: Admins can perform CRUD operations to manage tour guide profiles. Clients have access to dedicated pages to view tour guide information, enhancing their travel planning experience.

➕ Additional Features: The platform includes a wishlist and review submission system for packages and products, fostering user engagement. It features About and Services pages to provide company information, a unified error page, and a shared 404 page for handling invalid routes. Toaster messages deliver user feedback across all controllers, while client-side features like "Continue Reading" for blogs and a user signup page enhance usability. The UI is fully responsive, leveraging Bootstrap and Font Awesome for a polished experience.



🛠️ Tech Stack

🔧 Backend: Node.js, Express.js
🗄️ Database: MongoDB with Mongoose
🖥️ Frontend: EJS, Bootstrap, Font Awesome, Jodit Editor
🔒 Authentication: Express-session, bcrypt (password hashing)
💰 Payment Gateway: Stripe
