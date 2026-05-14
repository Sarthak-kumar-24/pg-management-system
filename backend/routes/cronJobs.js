const cron = require('node-cron');
const Payment = require('../models/Payment'); // Adjust path to your Payment model
const Tenant = require('../models/Tenant');   // Adjust path to your Tenant model

function startCronJobs() {
  // This tells the server: "Run this exact function every single day at 10:00 AM"
  // '0 10 * * *' = Minute 0, Hour 10, Every Day, Every Month, Every Year
  cron.schedule('0 10 * * *', async () => {
    
    const today = new Date();
    const currentDay = today.getDate();

    // 1. Only run on our specific "Nag Days" (Every 5 days after the 10th)
    const reminderDays = [11, 16, 21, 26];
    if (!reminderDays.includes(currentDay)) {
      return; // Do nothing today.
    }

    try {
      console.log('⏰ Running Dues Reminder Cron Job...');

      // 2. Find ALL payments that are NOT paid for the current month/year
      const pendingPayments = await Payment.find({
        status: { $ne: 'paid' },
        // Optionally filter by this month/year if you only want current dues
      }).populate('tenant');

      // 3. Group the debts by Tenant (in case someone owes Rent AND Electricity)
      const debtsByTenant = {};
      
      pendingPayments.forEach(payment => {
        if (!payment.tenant) return;
        const phone = payment.tenant.phone;
        
        if (!debtsByTenant[phone]) {
          debtsByTenant[phone] = {
            name: payment.tenant.name,
            totalDue: 0,
            email: payment.tenant.email
          };
        }
        debtsByTenant[phone].totalDue += payment.amount;
      });

      // 4. Send the external messages!
      for (const [phone, data] of Object.entries(debtsByTenant)) {
        
        const message = `Hi ${data.name}, this is a gentle reminder from PG Pro that you have an outstanding balance of ₹${data.totalDue}. Please log in to your portal to clear it to avoid late fees.`;

        // 🛑 HERE IS WHERE YOU CONNECT YOUR EXTERNAL MESSAGING PROVIDER
        
        // Example: Send SMS via Twilio / Fast2SMS
        // await sendSMS(phone, message);
        
        // Example: Send Email via Nodemailer
        // if (data.email) await sendEmail(data.email, 'Pending Dues Reminder', message);

        // Example: Send WhatsApp via Twilio/Meta API
        // await sendWhatsApp(phone, message);

        console.log(`Sent reminder to ${data.name} (${phone}) for ₹${data.totalDue}`);
      }

    } catch (error) {
      console.error('Cron Job Error:', error);
    }
  });
}

module.exports = startCronJobs;
