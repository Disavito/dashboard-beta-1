import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const res = await axios.post(`https://api.consultasperu.com/api/v1/query`, {
      token: process.env.VITE_CONSULTAS_PERU_API_TOKEN,
      type_document: "dni",
      document_number: "44444444", // Using a dummy DNI or typical one if possible. Or maybe skip the test.
    });
    console.log(res.data.data);
  } catch (e) {
    console.log(e.response?.data || e.message);
  }
}
run();
