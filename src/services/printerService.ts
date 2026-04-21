import { Order } from '../types';

// Web Bluetooth API Types (Minimal subset)
interface BluetoothDevice {
  gatt?: {
    connect(): Promise<any>;
    disconnect(): void;
    connected: boolean;
  };
}

interface BluetoothRemoteGATTCharacteristic {
  properties: {
    write: boolean;
    writeWithoutResponse: boolean;
  };
  writeValue(value: BufferSource): Promise<void>;
}

declare global {
  interface Navigator {
    bluetooth: {
      requestDevice(options: any): Promise<BluetoothDevice>;
    };
  }
}

// Basic ESC/POS commands
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

export class PrinterService {
  private device: any | null = null;
  private characteristic: any | null = null;
  private encoder = new TextEncoder();

  async connect() {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth is not supported in this browser or environment.');
    }
    
    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Generic Printer Service
          { services: ['0000ff00-0000-1000-8000-00805f9b34fb'] },
          { namePrefix: 'TP' },
          { namePrefix: 'BT' },
          { namePrefix: 'MP' }
        ],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '0000ff00-0000-1000-8000-00805f9b34fb']
      });

      const server = await this.device.gatt?.connect();
      const services = await server?.getPrimaryServices();
      
      if (!services || services.length === 0) throw new Error('No services found');

      // Try to find the write characteristic
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        const writeChar = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);
        if (writeChar) {
          this.characteristic = writeChar;
          break;
        }
      }

      if (!this.characteristic) throw new Error('Could not find write characteristic');

      return true;
    } catch (error) {
      console.error('Bluetooth connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
  }

  isConnected() {
    return !!this.characteristic && this.device?.gatt?.connected;
  }

  private async write(data: Uint8Array) {
    if (!this.characteristic) throw new Error('Printer not connected');
    
    // Most thermal printers have a small buffer, so we send in chunks
    const chunkSize = 20;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await this.characteristic.writeValue(chunk);
    }
  }

  async printReceipt(order: Order, items: any[]) {
    const commands: number[] = [
      ESC, 0x40, // Initialize
      ESC, 0x61, 0x01, // Center align
    ];

    const addText = (text: string) => {
      const bytes = this.encoder.encode(text);
      commands.push(...Array.from(bytes));
    };

    const addLine = (text: string = '') => {
      addText(text + '\n');
    };

    // Header
    addLine('SUPREME KITCHEN');
    addLine('--------------------------------');
    addLine('RECEIPT');
    addLine('Order: #' + order.id.slice(0, 8).toUpperCase());
    addLine(new Date(order.created_at).toLocaleString());
    addLine('--------------------------------');

    // Items
    commands.push(ESC, 0x61, 0x00); // Left align
    for (const item of items) {
      const name = item.menu_items?.name || 'Item';
      const qty = item.quantity;
      const price = item.price_at_time;
      addLine(`${qty}x ${name.slice(0, 18).padEnd(18)} ${price * qty}`);
    }
    addLine('--------------------------------');

    // Footer
    commands.push(ESC, 0x61, 0x02); // Right align
    commands.push(ESC, 0x45, 0x01); // Bold On
    addLine('TOTAL: RS ' + order.total_price);
    commands.push(ESC, 0x45, 0x00); // Bold Off
    addLine('--------------------------------');
    
    commands.push(ESC, 0x61, 0x01); // Center align
    addLine('THANK YOU FOR VISITING!');
    addLine('PLEASE VISIT AGAIN');
    
    // Feed and cut/space
    commands.push(LF, LF, LF, LF, LF);

    await this.write(new Uint8Array(commands));
  }
}

export const printerService = new PrinterService();
