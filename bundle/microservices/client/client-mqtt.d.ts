import { MqttClient } from '../external/mqtt-client.interface';
import { PacketId, ReadPacket, WritePacket } from '../interfaces';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { ClientProxy } from './client-proxy';
export declare class ClientMqtt extends ClientProxy {
    private readonly options;
    private readonly logger;
    private readonly url;
    private mqttClient;
    constructor(options: ClientOptions);
    getAckPatternName(pattern: string): string;
    getResPatternName(pattern: string): string;
    close(): void;
    connect(): Promise<any>;
    createClient(): MqttClient;
    handleError(client: MqttClient): void;
    createResponseCallback(packet: ReadPacket & PacketId, callback: (packet: WritePacket) => any): (channel: string, buffer) => any;
    protected publish(partialPacket: ReadPacket, callback: (packet: WritePacket) => any): Function;
}
