/*
 * NASA Protocol Packet Decoder Module
 * Handles decoding and parsing of NASA protocol packets
 */

// ==================== Constants ====================

const NASA_START_BYTE = 0x32;
const NASA_END_BYTE = 0x34;

// Address Classes
const AddressClass = {
	Outdoor: 0x10,
	HTU: 0x11,
	Indoor: 0x20,
	ERV: 0x30,
	Diffuser: 0x35,
	MCU: 0x38,
	RMC: 0x40,
	WiredRemote: 0x50,
	PIM: 0x58,
	SIM: 0x59,
	Peak: 0x5a,
	PowerDivider: 0x5b,
	OnOffController: 0x60,
	WiFiKit: 0x62,
	MIM: 0x63,
	CentralController: 0x65,
	DMS: 0x6a,
	JIGTester: 0x80,
	BroadcastSelfLayer: 0xb0,
	BroadcastControlLayer: 0xb1,
	BroadcastSetLayer: 0xb2,
	BroadcastControlAndSetLayer: 0xb3,
	BroadcastModuleLayer: 0xb4,
	BroadcastCSM: 0xb7,
	BroadcastLocalLayer: 0xb8,
	BroadcastCSML: 0xbf,
	Undefined: 0xff,
};

const AddressClassName = {
	0x10: "Outdoor",
	0x11: "HTU",
	0x20: "Indoor",
	0x30: "ERV",
	0x35: "Diffuser",
	0x38: "MCU",
	0x40: "RMC",
	0x50: "WiredRemote",
	0x58: "PIM",
	0x59: "SIM",
	0x5a: "Peak",
	0x5b: "PowerDivider",
	0x60: "OnOffController",
	0x62: "WiFiKit",
	0x63: "MIM",
	0x65: "CentralController",
	0x6a: "DMS",
	0x80: "JIGTester",
	0xb0: "BroadcastSelfLayer",
	0xb1: "BroadcastControlLayer",
	0xb2: "BroadcastSetLayer",
	0xb3: "BroadcastControlAndSetLayer",
	0xb4: "BroadcastModuleLayer",
	0xb7: "BroadcastCSM",
	0xb8: "BroadcastLocalLayer",
	0xbf: "BroadcastCSML",
	0xff: "Undefined",
};

// Packet Types
const PacketType = {
	StandBy: 0,
	Normal: 1,
	Gathering: 2,
	Install: 3,
	Download: 4,
};

const PacketTypeName = {
	0: "StandBy",
	1: "Normal",
	2: "Gathering",
	3: "Install",
	4: "Download",
};

// Data Types
const DataType = {
	Undefined: 0,
	Read: 1,
	Write: 2,
	Request: 3,
	Notification: 4,
	Response: 5,
	Ack: 6,
	Nack: 7,
};

const DataTypeName = {
	0: "Undefined",
	1: "Read",
	2: "Write",
	3: "Request",
	4: "Notification",
	5: "Response",
	6: "Ack",
	7: "Nack",
};

// Message Set Types
const MessageSetType = {
	Enum: 0,
	Variable: 1,
	LongVariable: 2,
	Structure: 3,
};

const MessageSetTypeName = {
	0: "Enum",
	1: "Variable",
	2: "LongVariable",
	3: "Structure",
};

// Message Numbers with names
const MessageNumberNames = {
	0x0000: "NASA_IM_MASTER_NOTIFY",
	0x0004: "NASA_INSPECTION_MODE",
	0x0007: "NASA_GATHER_INFORMATION",
	0x0008: "NASA_GATHER_INFORMATION_COUNT",
	0x000a: "NASA_ENABLEDOWNLOAD",
	0x000d: "NASA_DETECTION_TYPE",
	0x000e: "NASA_PEAK_LEVEL",
	0x000f: "NASA_PEAK_MODE",
	0x0010: "NASA_PEAK_CONTROL_PERIOD",
	0x0011: "NASA_POWER_MANUFACTURE",
	0x0012: "NASA_POWER_CHANNEL1_TYPE",
	0x0013: "NASA_POWER_CHANNEL2_TYPE",
	0x0014: "NASA_POWER_CHANNEL3_TYPE",
	0x0015: "NASA_POWER_CHANNEL4_TYPE",
	0x0016: "NASA_POWER_CHANNEL5_TYPE",
	0x0017: "NASA_POWER_CHANNEL6_TYPE",
	0x0018: "NASA_POWER_CHANNEL7_TYPE",
	0x0019: "NASA_POWER_CHANNEL8_TYPE",
	0x001a: "NASA_POWER_CHANNEL1_USED",
	0x001b: "NASA_POWER_CHANNEL2_USED",
	0x001c: "NASA_POWER_CHANNEL3_USED",
	0x001d: "NASA_POWER_CHANNEL4_USED",
	0x001e: "NASA_POWER_CHANNEL5_USED",
	0x001f: "NASA_POWER_CHANNEL6_USED",
	0x0020: "NASA_POWER_CHANNEL7_USED",
	0x0021: "NASA_POWER_CHANNEL8_USED",
	0x0023: "NASA_STANDBY_MODE",
	0x0025: "ENUM_AD_MULTI_TENANT_NO",
	0x0202: "VAR_AD_ERROR_CODE1",
	0x0203: "NASA_ERROR_CODE2",
	0x0204: "NASA_ERROR_CODE3",
	0x0205: "NASA_ERROR_CODE4",
	0x0206: "NASA_ERROR_CODE5",
	0x0207: "VAR_AD_INSTALL_NUMBER_INDOOR",
	0x0208: "NASA_OUTDOOR_ERVCOUNT",
	0x0209: "NASA_OUTDOOR_EHSCOUNT",
	0x0210: "NASA_NET_ADDRESS",
	0x0211: "VAR_AD_INSTALL_NUMBER_MCU",
	0x0213: "NASA_DEMAND_SYNC_TIME",
	0x0214: "NASA_PEAK_TARGET_DEMAND",
	0x0217: "NASA_PNP_NET_ADDRESS",
	0x0401: "LVAR_AD_ADDRESS_MAIN",
	0x0402: "LVAR_AD_ADDRESS_RMC",
	0x0403: "NASA_RANDOM_ADDRESS",
	0x0406: "NASA_ALL_POWER_CONSUMPTION_SET",
	0x0407: "NASA_ALL_POWER_CONSUMPTION_CUMULATIVE",
	0x0408: "LVAR_AD_ADDRESS_SETUP",
	0x0409: "LVAR_AD_INSTALL_LEVEL_ALL",
	0x040a: "LVAR_AD_INSTALL_LEVEL_OPERATION_POWER",
	0x040b: "LVAR_AD_INSTALL_LEVEL_OPERATION_MODE",
	0x040c: "LVAR_AD_INSTALL_LEVEL_FAN_MODE",
	0x040d: "LVAR_AD_INSTALL_LEVEL_FAN_DIRECTION",
	0x040e: "LVAR_AD_INSTALL_LEVEL_TEMP_TARGET",
	0x040f: "LVAR_AD_INSTALL_LEVEL_KEEP_INDIVIDUAL_CONTROL",
	0x0410: "LVAR_AD_INSTALL_LEVEL_OPERATION_MODE_ONLY",
	0x0411: "LVAR_AD_INSTALL_LEVEL_COOL_MODE_UPPER",
	0x0412: "LVAR_AD_INSTALL_LEVEL_COOL_MODE_LOWER",
	0x0413: "LVAR_AD_INSTALL_LEVEL_HEAT_MODE_UPPER",
	0x0414: "LVAR_AD_INSTALL_LEVEL_HEAT_MODE_LOWER",
	0x0415: "LVAR_AD_INSTALL_LEVEL_CONTACT_CONTROL",
	0x0416: "LVAR_AD_INSTALL_LEVEL_KEY_OPERATION_INPUT",
	0x0417: "NASA_PNP_CONFIRM_ADDRESS",
	0x0418: "NASA_PNP_RANDOM_ADDRESS",
	0x0419: "NASA_PNP_SETUP_ADDRESS",
	0x041c: "NASA_POWER_CHANNEL1_ELECTRIC_VALUE",
	0x041d: "NASA_POWER_CHANNEL2_ELECTRIC_VALUE",
	0x041e: "NASA_POWER_CHANNEL3_ELECTRIC_VALUE",
	0x041f: "NASA_POWER_CHANNEL4_ELECTRIC_VALUE",
	0x0420: "NASA_POWER_CHANNEL5_ELECTRIC_VALUE",
	0x0421: "NASA_POWER_CHANNEL6_ELECTRIC_VALUE",
	0x0422: "NASA_POWER_CHANNEL7_ELECTRIC_VALUE",
	0x0423: "NASA_POWER_CHANNEL8_ELECTRIC_VALUE",
	0x0434: "NASA_PEAK_RATIO_CURRENT",
	0x0435: "NASA_PEAK_RATIO_POTENTIAL",
	0x0436: "NASA_PEAK_TOTAL_POWER",
	0x0437: "NASA_PEAK_CURRENT_TARGET_DEMAND",
	0x0438: "NASA_PEAK_FORCAST_DEMAND",
	0x0439: "NASA_PEAK_TOP_DEMAND",
	0x043a: "NASA_PEAK_TARGET_POWER",
	0x043b: "NASA_POWER_CHANNEL1_PULSEVALUE",
	0x043c: "NASA_POWER_CHANNEL2_PULSEVALUE",
	0x043d: "NASA_POWER_CHANNEL3_PULSEVALUE",
	0x043e: "NASA_POWER_CHANNEL4_PULSEVALUE",
	0x043f: "NASA_POWER_CHANNEL5_PULSEVALUE",
	0x0440: "NASA_POWER_CHANNEL6_PULSEVALUE",
	0x0441: "NASA_POWER_CHANNEL7_PULSEVALUE",
	0x0442: "NASA_POWER_CHANNEL8_PULSEVALUE",
	0x0443: "NASA_PEAK_SYNC_TIME",
	0x0444: "NASA_PEAK_CURRENT_DEMAND",
	0x0445: "NASA_PEAK_REAL_VALUE",
	0x0448: "LVAR_AD_MCU_PORT_SETUP",
	0x0600: "STR_AD_OPTION_BASIC",
	0x0601: "STR_AD_OPTION_INSTALL",
	0x0602: "STR_AD_OPTION_INSTALL_2",
	0x0603: "STR_AD_OPTION_CYCLE",
	0x0604: "NASA_PBAOPTION",
	0x0605: "STR_AD_INFO_EQUIP_POSITION",
	0x0607: "STR_AD_ID_SERIAL_NUMBER",
	0x0608: "STR_AD_DBCODE_MICOM_MAIN",
	0x060c: "STR_AD_DBCODE_EEPROM",
	0x0613: "NASA_SIMPIM_SYNC_DATETIME",
	0x0619: "NASA_SIMPIM_PASSWORD",
	0x061a: "STR_AD_PRODUCT_MODEL_NAME",
	0x061c: "STR_AD_PRODUCT_MAC_ADDRESS",
	0x061f: "STR_AD_ID_MODEL_NAME",
	0x2000: "NASA_IM_MASTER",
	0x2001: "NASA_CHANGE_POLAR",
	0x2002: "NASA_ADDRESSING_ASSIGN_CONFIRM_ADDRESS",
	0x2003: "NASA_ADDRESSING",
	0x2004: "NASA_PNP",
	0x2006: "NASA_CHANGE_CONTROL_NETWORK_STATUS",
	0x2007: "NASA_CHANGE_SET_NETWORK_STATUS",
	0x2008: "NASA_CHANGE_LOCAL_NETWORK_STATUS",
	0x2009: "NASA_CHANGE_MODULE_NETWORK_STATUS",
	0x200a: "NASA_CHANGE_ALL_NETWORK_STATUS",
	0x200f: "ENUM_NM_NETWORK_POSITINON_LAYER",
	0x2010: "ENUM_NM_NETWORK_TRACKING_STATE",
	0x2017: "NASA_COMMU_MICOM_LED",
	0x2018: "NASA_COMMU_MICOM_BUTTON",
	0x2400: "NASA_ALL_LAYER_DEVICE_COUNT",
	0x4000: "ENUM_IN_OPERATION_POWER",
	0x4001: "ENUM_IN_OPERATION_MODE",
	0x4002: "ENUM_IN_OPERATION_MODE_REAL",
	0x4003: "ENUM_IN_OPERATION_VENT_POWER",
	0x4004: "ENUM_IN_OPERATION_VENT_MODE",
	0x4006: "NASA_FANSPEED",
	0x4007: "ENUM_IN_FAN_MODE_REAL",
	0x4008: "ENUM_IN_FAN_VENT_MODE",
	0x4011: "ENUM_IN_LOUVER_HL_SWING",
	0x4012: "ENUM_IN_LOUVER_HL_PART_SWING",
	0x4018: "NASA_USE_WIREDREMOTE",
	0x4019: "NASA_USE_DISCHARGE_TEMP",
	0x401b: "NASA_USE_CENTUAL_CONTROL",
	0x4023: "NASA_USE_SPI",
	0x4024: "NASA_USE_FILTER_WARNING_TIME",
	0x4025: "NASA_FILTER_CLEAN",
	0x4027: "ENUM_IN_FILTER_WARNING",
	0x4028: "ENUM_IN_STATE_THERMO",
	0x402e: "ENUM_IN_STATE_DEFROST_MODE",
	0x402f: "ENUM_IN_MTFC",
	0x4038: "ENUM_IN_STATE_HUMIDITY_PERCENT",
	0x403d: "NASA_CONTROL_OAINTAKE",
	0x403e: "NASA_USE_MDS",
	0x403f: "NASA_CONTROL_MDS",
	0x4040: "NASA_USE_HUMIDIFICATION",
	0x4041: "NASA_CONTROL_HUMIDIFICATION",
	0x4042: "NASA_CONTROL_AUTO_CLEAN",
	0x4043: "NASA_CONTROL_SPI",
	0x4045: "NASA_USE_SILENCE",
	0x4046: "ENUM_IN_SILENCE",
	0x4050: "NASA_CONTROL_SILENCT",
	0x405b: "NASA_USE_OUTER_COOL",
	0x405c: "NASA_CONTROL_OUTER_COOL",
	0x405d: "NASA_USE_DESIRED_HUMIDITY",
	0x405e: "NASA_CONTROL_DESIRED_HUMIDITY",
	0x4060: "ENUM_IN_ALTERNATIVE_MODE",
	0x4063: "NASA_EHS_INDOOR_POWER",
	0x4064: "NASA_EHS_INDOOR_OPMODE",
	0x4065: "ENUM_IN_WATER_HEATER_POWER",
	0x4066: "ENUM_IN_WATER_HEATER_MODE",
	0x4067: "ENUM_IN_3WAY_VALVE",
	0x4068: "ENUM_IN_SOLAR_PUMP",
	0x4069: "ENUM_IN_THERMOSTAT1",
	0x406a: "ENUM_IN_THERMOSTAT2",
	0x406b: "NASA_SMART_GRID",
	0x406c: "ENUM_IN_BACKUP_HEATER",
	0x406d: "ENUM_IN_OUTING_MODE",
	0x406e: "ENUM_IN_QUIET_MODE",
	0x406f: "ENUM_IN_REFERENCE_EHS_TEMP",
	0x4070: "ENUM_IN_DISCHAGE_TEMP_CONTROL",
	0x4076: "ENUM_IN_ROOM_TEMP_SENSOR",
	0x407e: "ENUM_IN_LOUVER_LR_SWING",
	0x4087: "ENUM_IN_BOOSTER_HEATER",
	0x4089: "ENUM_IN_STATE_WATER_PUMP",
	0x408a: "ENUM_IN_2WAY_VALVE",
	0x4093: "ENUM_IN_FSV_2041",
	0x4094: "ENUM_IN_FSV_2081",
	0x4095: "ENUM_IN_FSV_2091",
	0x4096: "ENUM_IN_FSV_2092",
	0x4097: "ENUM_IN_FSV_3011",
	0x4098: "ENUM_IN_FSV_3031",
	0x4099: "ENUM_IN_FSV_3041",
	0x409a: "ENUM_IN_FSV_3042",
	0x409b: "ENUM_IN_FSV_3051",
	0x409c: "ENUM_IN_FSV_3061",
	0x409d: "ENUM_IN_FSV_3071",
	0x409e: "ENUM_IN_FSV_4011",
	0x409f: "ENUM_IN_FSV_4021",
	0x40a0: "ENUM_IN_FSV_4022",
	0x40a1: "ENUM_IN_FSV_4023",
	0x40a2: "ENUM_IN_FSV_4031",
	0x40a3: "ENUM_IN_FSV_4032",
	0x40a4: "ENUM_IN_FSV_5041",
	0x40a5: "ENUM_IN_FSV_5042",
	0x40a6: "ENUM_IN_FSV_5043",
	0x40a7: "ENUM_IN_FSV_5051",
	0x40b1: "NASA_DHW_OPMODE_SUPPORT",
	0x40b4: "ENUM_IN_FSV_5061",
	0x40bb: "ENUM_IN_STATE_AUTO_STATIC_PRESSURE_RUNNING",
	0x40bc: "ENUM_IN_STATE_KEY_TAG",
	0x40bd: "ENUM_IN_EMPTY_ROOM_CONTROL_USED",
	0x40c0: "ENUM_IN_FSV_4041",
	0x40c1: "ENUM_IN_FSV_4044",
	0x40c2: "ENUM_IN_FSV_4051",
	0x40c3: "ENUM_IN_FSV_4053",
	0x40c4: "ENUM_IN_WATERPUMP_PWM_VALUE",
	0x40c5: "ENUM_IN_THERMOSTAT_WATER_HEATER",
	0x40c7: "NASA_AHUPANEL_ENTHALPY_CONTROL",
	0x40c8: "NASA_AHUPANEL_DUTY_CONTROL",
	0x40c9: "NASA_AHUPANEL_SUMMERNIGHT_CONTROL",
	0x40ca: "NASA_AHUPANEL_CO2_CONTROL",
	0x40cb: "NASA_AHUPANEL_ENERGYMANAGE_CONTROL",
	0x40cc: "NASA_AHUPANEL_RA_SMOKE_DECTION_STATUS",
	0x40cd: "NASA_AHUPANEL_SA_FAN_STATUS",
	0x40ce: "NASA_AHUPANEL_RA_FAN_ONOFF_STATUS",
	0x40cf: "NASA_AHUPANEL_ERROR_STATUS",
	0x40d0: "NASA_AHUPANEL_HEATER_ONOFF_STATUS",
	0x40d1: "NASA_AHUPANEL_SA_FAN_ONOFF_STATUS",
	0x40d2: "NASA_AHUPANEL_SMOKE_DECTION_CONTROL",
	0x40d5: "ENUM_IN_ENTER_ROOM_CONTROL_USED",
	0x40d6: "ENUM_IN_ERROR_HISTORY_CLEAR_FOR_HASS",
	0x40e7: "ENUM_IN_CHILLER_WATERLAW_SENSOR",
	0x40f7: "ENUM_IN_CHILLER_WATERLAW_ON_OFF",
	0x40fb: "ENUM_IN_CHILLLER_SETTING_SILENT_LEVEL",
	0x40fc: "ENUM_IN_CHILLER_SETTING_DEMAND_LEVEL",
	0x4101: "ENUM_IN_CHILLER_EXT_WATER_OUT_INPUT",
	0x4102: "ENUM_IN_STATE_FLOW_CHECK",
	0x4103: "ENUM_IN_WATER_VALVE_1_ON_OFF",
	0x4104: "ENUM_IN_WATER_VALVE_2_ON_OFF",
	0x4105: "ENUM_IN_ENTHALPY_CONTROL_STATE",
	0x4107: "ENUM_IN_FSV_5033",
	0x4108: "ENUM_IN_TDM_INDOOR_TYPE",
	0x410d: "ENUM_IN_FREE_COOLING_STATE",
	0x4113: "ENUM_IN_3WAY_VALVE_2",
	0x4119: "ENUM_IN_OPERATION_POWER_ZONE1",
	0x411a: "ENUM_IN_FSV_4061",
	0x411b: "ENUM_IN_FSV_5081",
	0x411c: "ENUM_IN_FSV_5091",
	0x411d: "ENUM_IN_FSV_5094",
	0x411e: "ENUM_IN_OPERATION_POWER_ZONE2",
	0x4123: "ENUM_IN_PV_CONTACT_STATE",
	0x4124: "ENUM_IN_SG_READY_MODE_STATE",
	0x4125: "ENUM_IN_FSV_LOAD_SAVE",
	0x4127: "ENUM_IN_FSV_2093",
	0x4128: "ENUM_IN_FSV_5022",
	0x412a: "ENUM_IN_FSV_2094",
	0x412d: "ENUM_IN_FSV_LOAD_SAVE",
	0x4147: "ENUM_IN_GAS_LEVEL",
	0x4149: "ENUM_IN_DIFFUSER_OPERATION_POWER",
	0x4201: "VAR_IN_TEMP_TARGET_F",
	0x4203: "VAR_IN_TEMP_ROOM_F",
	0x4204: "NASA_MODIFIED_CURRENT_TEMP",
	0x4205: "VAR_IN_TEMP_EVA_IN_F",
	0x4206: "VAR_IN_TEMP_EVA_OUT_F",
	0x4207: "VAR_IN_TEMP_ELECTRIC_HEATER_F",
	0x4208: "NASA_EVA_INHOLE_TEMP",
	0x4209: "NASA_SET_DISCHARGE",
	0x420b: "VAR_IN_TEMP_DISCHARGE",
	0x420c: "NASA_INDOOR_OUTER_TEMP",
	0x4211: "VAR_IN_CAPACITY_REQUEST",
	0x4212: "VAR_IN_CAPACITY_ABSOLUTE",
	0x4217: "VAR_IN_EEV_VALUE_REAL_1",
	0x4218: "VAR_IN_EEV_VALUE_REAL_2",
	0x4219: "NASA_INDOOR_CURRENT_EEV3",
	0x421a: "NASA_INDOOR_CURRENT_EEV4",
	0x421b: "VAR_IN_SENSOR_CO2_PPM",
	0x4220: "NASA_INDOOR_AIRCLEANFAN_CURRENT_RPM",
	0x4229: "VAR_IN_MODEL_INFORMATION",
	0x422a: "VAR_IN_TEMP_DISCHARGE_COOL_TARGET_F",
	0x422b: "VAR_IN_TEMP_DISCHARGE_HEAT_TARGET_F",
	0x4235: "VAR_IN_TEMP_WATER_HEATER_TARGET_F",
	0x4236: "VAR_IN_TEMP_WATER_IN_F",
	0x4237: "VAR_IN_TEMP_WATER_TANK_F",
	0x4238: "VAR_IN_TEMP_WATER_OUT_F",
	0x4239: "VAR_IN_TEMP_WATER_OUT2_F",
	0x4247: "VAR_IN_TEMP_WATER_OUTLET_TARGET_F",
	0x4248: "VAR_IN_TEMP_WATER_LAW_TARGET_F",
	0x424a: "VAR_IN_FSV_1011",
	0x424b: "VAR_IN_FSV_1012",
	0x424c: "VAR_IN_FSV_1021",
	0x424d: "VAR_IN_FSV_1022",
	0x424e: "VAR_IN_FSV_1031",
	0x424f: "VAR_IN_FSV_1032",
	0x4250: "VAR_IN_FSV_1041",
	0x4251: "VAR_IN_FSV_1042",
	0x4252: "VAR_IN_FSV_1051",
	0x4253: "VAR_IN_FSV_1052",
	0x4254: "VAR_IN_FSV_2011",
	0x4255: "VAR_IN_FSV_2012",
	0x4256: "VAR_IN_FSV_2021",
	0x4257: "VAR_IN_FSV_2022",
	0x4258: "VAR_IN_FSV_2031",
	0x4259: "VAR_IN_FSV_2032",
	0x425a: "VAR_IN_FSV_2051",
	0x425b: "VAR_IN_FSV_2052",
	0x425c: "VAR_IN_FSV_2061",
	0x425d: "VAR_IN_FSV_2062",
	0x425e: "VAR_IN_FSV_2071",
	0x425f: "VAR_IN_FSV_2072",
	0x4260: "VAR_IN_FSV_3021",
	0x4261: "VAR_IN_FSV_3022",
	0x4262: "VAR_IN_FSV_3023",
	0x4263: "VAR_IN_FSV_3024",
	0x4264: "VAR_IN_FSV_3025",
	0x4265: "VAR_IN_FSV_3026",
	0x4266: "VAR_IN_FSV_3032",
	0x4267: "VAR_IN_FSV_3033",
	0x4268: "VAR_IN_FSV_3034",
	0x4269: "VAR_IN_FSV_3043",
	0x426a: "VAR_IN_FSV_3044",
	0x426b: "VAR_IN_FSV_3045",
	0x426c: "VAR_IN_FSV_3052",
	0x426d: "VAR_IN_FSV_4012",
	0x426e: "VAR_IN_FSV_4013",
	0x426f: "VAR_IN_FSV_4014",
	0x4270: "VAR_IN_FSV_4024",
	0x4271: "VAR_IN_FSV_4025",
	0x4272: "VAR_IN_FSV_4033",
	0x4273: "VAR_IN_FSV_5011",
	0x4274: "VAR_IN_FSV_5012",
	0x4275: "VAR_IN_FSV_5013",
	0x4276: "VAR_IN_FSV_5014",
	0x4277: "VAR_IN_FSV_5015",
	0x4278: "VAR_IN_FSV_5016",
	0x4279: "VAR_IN_FSV_5017",
	0x427a: "VAR_IN_FSV_5018",
	0x427b: "VAR_IN_FSV_5019",
	0x427c: "VAR_IN_FSV_5021",
	0x427d: "VAR_IN_FSV_5031",
	0x427e: "VAR_IN_FSV_5032",
	0x427f: "VAR_IN_TEMP_WATER_LAW_F",
	0x4284: "NASA_INDOOR_POWER_CONSUMPTION",
	0x4286: "VAR_IN_FSV_4042",
	0x4287: "VAR_IN_FSV_4043",
	0x4288: "VAR_IN_FSV_4045",
	0x4289: "VAR_IN_FSV_4046",
	0x428a: "VAR_IN_FSV_4052",
	0x428c: "VAR_IN_TEMP_MIXING_VALVE_F",
	0x4290: "NASA_AHUPANEL_TARGET_HUMIDITY",
	0x4291: "NASA_AHUPANEL_OA_DAMPER_TARGET_RATE",
	0x4292: "NASA_AHUPANEL_RA_TEMP",
	0x4293: "NASA_AHUPANEL_RA_HUMIDITY",
	0x4294: "NASA_AHUPANEL_EA_RATE",
	0x4295: "NASA_AHUPANEL_OA_TEMP",
	0x4296: "NASA_AHUPANEL_OA_HUMIDITY",
	0x4297: "VAR_AHU_PANEL_SA_TEMP",
	0x4298: "VAR_AHU_PANEL_SA_HUMIDITY",
	0x4299: "NASA_AHUPANEL_STATIC_PRESSURE",
	0x429a: "NASA_AHUPANEL_MIXING_TEMP",
	0x429b: "NASA_AHUPANEL_MIXING_RATE",
	0x429c: "NASA_AHUPANEL_POINT_STATUS",
	0x429f: "VAR_IN_FAN_CURRENT_RPM_SUCTION1",
	0x42a1: "VAR_IN_FAN_CURRENT_RPM_SUCTION2",
	0x42a3: "VAR_IN_FAN_CURRENT_RPM_SUCTION3",
	0x42a5: "VAR_IN_TEMP_PANEL_AIR_COOL1_F",
	0x42a6: "VAR_IN_TEMP_PANEL_AIR_COOL2_F",
	0x42a7: "VAR_IN_TEMP_PANEL_ROOM_COOL1_F",
	0x42a8: "VAR_IN_TEMP_PANEL_ROOM_COOL2_F",
	0x42a9: "VAR_IN_TEMP_PANEL_TARGET_COOL1_F",
	0x42aa: "VAR_IN_TEMP_PANEL_TARGET_COOL2_F",
	0x42ab: "VAR_IN_TEMP_PANEL_AIR_HEAT1_F",
	0x42ac: "VAR_IN_TEMP_PANEL_AIR_HEAT2_F",
	0x42ad: "VAR_IN_TEMP_PANEL_ROOM_HEAT1_F",
	0x42ae: "VAR_IN_TEMP_PANEL_ROOM_HEAT2_F",
	0x42af: "VAR_IN_TEMP_PANEL_TARGET_HEAT1_F",
	0x42b0: "VAR_IN_TEMP_PANEL_TARGET_HEAT2_F",
	0x42b1: "VAR_IN_MCC_GROUP_MODULE_ADDRESS",
	0x42b2: "VAR_IN_MCC_GROUP_MAIN",
	0x42b3: "VAR_IN_MCC_MODULE_MAIN",
	0x42c2: "VAR_IN_TEMP_EVA2_IN_F",
	0x42c3: "VAR_IN_TEMP_EVA2_OUT_F",
	0x42c4: "VAR_IN_CHILLER_PHE_IN_P",
	0x42c5: "VAR_IN_CHILLER_PHE_OUT_P",
	0x42c9: "VAR_IN_CHILLER_EXTERNAL_TEMPERATURE",
	0x42ca: "VAR_IN_MODULATING_VALVE_1",
	0x42cb: "VAR_IN_MODULATING_VALVE_2",
	0x42cc: "VAR_IN_MODULATING_FAN",
	0x42cd: "VAR_IN_TEMP_WATER_IN2_F",
	0x42ce: "VAR_IN_FSV_3046",
	0x42cf: "VAR_IN_ENTHALPY_SENSOR_OUTPUT",
	0x42d0: "VAR_IN_EXT_VARIABLE_DAMPER_OUTPUT",
	0x42d1: "VAR_IN_DUST_SENSOR_PM10_0_VALUE",
	0x42d2: "VAR_IN_DUST_SENSOR_PM2_5_VALUE",
	0x42d3: "VAR_IN_DUST_SENSOR_PM1_0_VALUE",
	0x42d4: "VAR_IN_TEMP_ZONE2_F",
	0x42d6: "VAR_IN_TEMP_TARGET_ZONE2_F",
	0x42d7: "VAR_IN_TEMP_WATER_OUTLET_TARGET_ZONE2_F",
	0x42d8: "VAR_IN_TEMP_WATER_OUTLET_ZONE1_F",
	0x42d9: "VAR_IN_TEMP_WATER_OUTLET_ZONE2_F",
	0x42db: "VAR_IN_FSV_5082",
	0x42dc: "VAR_IN_FSV_5083",
	0x42dd: "VAR_IN_FSV_5092",
	0x42de: "VAR_IN_FSV_5093",
	0x42e8: "VAR_IN_FLOW_SENSOR_VOLTAGE",
	0x42e9: "VAR_IN_FLOW_SENSOR_CALC",
	0x42ed: "VAR_IN_FSV_3081",
	0x42ee: "VAR_IN_FSV_3082",
	0x42ef: "VAR_IN_FSV_3083",
	0x42f0: "VAR_IN_FSV_5023",
	0x42f1: "VAR_OUT_COMP_FREQ_RATE_CONTROL",
	0x4302: "VAR_IN_CAPACITY_VENTILATION_REQUEST",
	0x4405: "NASA_GROUPCONTROL_BIT1",
	0x4406: "NASA_GROUPCONTROL_BIT2",
	0x4407: "NASA_GROUPCONTROL_BIT3",
	0x440a: "LVAR_IN_DEVICE_STAUS_HEATPUMP_BOILER",
	0x440f: "NASA_ERROR_INOUT",
	0x4415: "LVAR_IN_AUTO_STATIC_PRESSURE",
	0x4418: "LVAR_IN_EMPTY_ROOM_CONTROL_DATA",
	0x441b: "LVAR_IN_ENTER_ROOM_CONTROL_DATA",
	0x441f: "LVAR_IN_ETO_COOL_CONTROL_DATA",
	0x4420: "LVAR_IN_ETO_HEAT_CONTROL_DATA",
	0x4604: "STR_IN_INSTALL_INDOOR_SETUP_INFO",
	0x4608: "NASA_INDOOR_SETTING_MIN_MAX_TEMP",
	0x4619: "NASA_EHS_SETTING_MIN_MAX_TEMP",
	0x461a: "NASA_EHS_FSV_SETTING_MIN_MAX_TEMP",
	0x461c: "NASA_AHUPANEL_AHUKIT_ADDRESS",
	0x461d: "NASA_AHUPANEL_PANEL_OPTION",
	0x461e: "STR_IN_ERROR_HISTORY_FOR_HASS",
	0x8000: "ENUM_OUT_OPERATION_SERVICE_OP",
	0x8001: "ENUM_OUT_OPERATION_ODU_MODE",
	0x8003: "ENUM_OUT_OPERATION_HEATCOOL",
	0x8010: "ENUM_OUT_LOAD_COMP1",
	0x8011: "ENUM_OUT_LOAD_COMP2",
	0x8012: "ENUM_OUT_LOAD_COMP3",
	0x8013: "ENUM_OUT_LOAD_CCH1",
	0x8014: "ENUM_OUT_LOAD_CCH2",
	0x8015: "NASA_OUTDOOR_CCH3_STATUS",
	0x8016: "NASA_OUTDOOR_ACCUMULATOR_CCH",
	0x8017: "ENUM_OUT_LOAD_HOTGAS",
	0x8018: "ENUM_OUT_LOAD_HOTGAS2",
	0x8019: "ENUM_OUT_LOAD_LIQUID",
	0x801a: "ENUM_OUT_LOAD_4WAY",
	0x801f: "ENUM_OUT_LOAD_MAINCOOL",
	0x8020: "ENUM_OUT_LOAD_OUTEEV",
	0x8021: "ENUM_OUT_LOAD_EVI_BYPASS",
	0x8022: "ENUM_OUT_LOAD_EVI_SOL1",
	0x8023: "ENUM_OUT_LOAD_EVI_SOL2",
	0x8024: "NASA_OUTDOOR_EVI_SOL3_VALVE",
	0x8025: "ENUM_OUT_LOAD_GASCHARGE",
	0x8026: "ENUM_OUT_LOAD_WATER",
	0x8027: "ENUM_OUT_LOAD_PUMPOUT",
	0x802a: "ENUM_OUT_LOAD_4WAY2",
	0x8034: "ENUM_OUT_LOAD_LIQUIDTUBE",
	0x8037: "ENUM_OUT_LOAD_ACCRETURN",
	0x803b: "ENUM_OUT_LOAD_FLOW_SWITCH",
	0x803c: "ENUM_OUT_OPERATION_AUTO_INSPECT_STEP",
	0x8046: "ENUM_OUT_OP_TEST_OP_COMPLETE",
	0x8047: "NASA_OUTDOOR_SERVICEOPERATION",
	0x8049: "ENUM_OUT_MCU_LOAD_COOL_A",
	0x804a: "ENUM_OUT_MCU_LOAD_HEAT_A",
	0x804b: "ENUM_OUT_MCU_LOAD_COOL_B",
	0x804c: "ENUM_OUT_MCU_LOAD_HEAT_B",
	0x804d: "ENUM_OUT_MCU_LOAD_COOL_C",
	0x804e: "ENUM_OUT_MCU_LOAD_HEAT_C",
	0x804f: "ENUM_OUT_MCU_LOAD_COOL_D",
	0x8050: "ENUM_OUT_MCU_LOAD_HEAT_D",
	0x8051: "ENUM_OUT_MCU_LOAD_COOL_E",
	0x8052: "ENUM_OUT_MCU_LOAD_HEAT_E",
	0x8053: "ENUM_OUT_MCU_LOAD_COOL_F",
	0x8054: "ENUM_OUT_MCU_LOAD_HEAT_F",
	0x8055: "ENUM_OUT_MCU_LOAD_LIQUID",
	0x8058: "ENUM_OUT_MCU_PORT0_INDOOR_ADDR",
	0x8059: "ENUM_OUT_MCU_PORT1_INDOOR_ADDR",
	0x805a: "ENUM_OUT_MCU_PORT2_INDOOR_ADDR",
	0x805b: "ENUM_OUT_MCU_PORT3_INDOOR_ADDR",
	0x805c: "ENUM_OUT_MCU_PORT4_INDOOR_ADDR",
	0x805d: "ENUM_OUT_MCU_PORT5_INDOOR_ADDR",
	0x8061: "ENUM_OUT_DEICE_STEP_INDOOR",
	0x8062: "NASA_OUTDOOR_LOGICAL_DEFROST_STEP",
	0x8065: "NASA_OUTDOOR_SYSTEM_RESET",
	0x8066: "NASA_OUTDOOR_OPMODELIMIT",
	0x8081: "NASA_OUTDOOR_EXT_CMD_OPERATION",
	0x808e: "ENUM_OUT_OP_CHECK_REF_STEP",
	0x8092: "ENUM_OUT_INSTALL_ODU_COUNT",
	0x8099: "ENUM_OUT_CONTROL_FAN_NUM",
	0x809c: "ENUM_OUT_CHECK_REF_RESULT",
	0x809d: "NASA_OUTDOOR_COOLONLY_MODEL",
	0x809e: "ENUM_OUT_LOAD_CBOX_COOLING_FAN",
	0x80a5: "ENUM_OUT_STATE_BACKUP_OPER",
	0x80a6: "ENUM_OUT_STATE_COMP_PROTECT_OPER",
	0x80a7: "NASA_OUTDOOR_DRED_LEVEL",
	0x80ac: "NASA_OUTDOOR_ACCUM_RETURN2_VALVE",
	0x80af: "ENUM_OUT_LOAD_BASEHEATER",
	0x80b2: "NASA_OUTDOOR_CH_SWITCH_VALUE",
	0x80b4: "ENUM_OUT_STATE_ACCUM_VALVE_ONOFF",
	0x80b8: "ENUM_OUT_LOAD_OIL_BYPASS1",
	0x80b9: "ENUM_OUT_LOAD_OIL_BYPASS2",
	0x80be: "ENUM_OUT_OP_A2_CURRENTMODE",
	0x80c1: "ENUM_OUT_LOAD_A2A_VALVE",
	0x80d7: "ENUM_OUT_LOAD_PHEHEATER",
	0x80d8: "ENUM_OUT_EHS_WATEROUT_TYPE",
	0x8200: "NASA_OUTDOOR_OPMODE_OPTION",
	0x8202: "VAR_OUT_INSTALL_COMP_NUM",
	0x8204: "VAR_OUT_SENSOR_AIROUT",
	0x8206: "VAR_OUT_SENSOR_HIGHPRESS",
	0x8208: "VAR_OUT_SENSOR_LOWPRESS",
	0x820a: "VAR_OUT_SENSOR_DISCHARGE1",
	0x820c: "VAR_OUT_SENSOR_DISCHARGE2",
	0x820e: "VAR_OUT_SENSOR_DISCHARGE3",
	0x8210: "NASA_OUTDOOR_SUMPTEMP",
	0x8217: "VAR_OUT_SENSOR_CT1",
	0x8218: "VAR_OUT_SENSOR_CONDOUT",
	0x821a: "VAR_OUT_SENSOR_SUCTION",
	0x821c: "VAR_OUT_SENSOR_DOUBLETUBE",
	0x821e: "VAR_OUTCD__SENSOR_EVIIN",
	0x8220: "VAR_OUT_SENSOR_EVIOUT",
	0x8222: "NASA_OUTDOOR_OLP_TEMP",
	0x8223: "VAR_OUT_CONTROL_TARGET_DISCHARGE",
	0x8226: "VAR_OUT_LOAD_FANSTEP1",
	0x8227: "NASA_OUTDOOR_FAN_STEP2",
	0x8228: "NASA_OUTDOOR_LOADINGTIME",
	0x8229: "VAR_OUT_LOAD_OUTEEV1",
	0x822a: "VAR_OUT_LOAD_OUTEEV2",
	0x822b: "VAR_OUT_LOAD_OUTEEV3",
	0x822c: "VAR_OUT_LOAD_OUTEEV4",
	0x822d: "VAR_OUT_LOAD_OUTEEV5",
	0x822e: "VAR_OUT_LOAD_EVIEEV",
	0x822f: "NASA_OUTDOOR_HREEV",
	0x8230: "NASA_OUTDOOR_RUNNING_SUM_CAPA",
	0x8231: "NASA_OUTDOOR_HEATING_PERCENT",
	0x8233: "NASA_OUTDOOR_OPERATION_CAPA_SUM",
	0x8235: "VAR_OUT_ERROR_CODE",
	0x8236: "VAR_OUT_CONTROL_ORDER_CFREQ_COMP1",
	0x8237: "VAR_OUT_CONTROL_TARGET_CFREQ_COMP1",
	0x8238: "VAR_OUT_CONTROL_CFREQ_COMP1",
	0x823b: "VAR_OUT_SENSOR_DCLINK_VOLTAGE",
	0x823d: "VAR_OUT_LOAD_FANRPM1",
	0x823e: "VAR_OUT_LOAD_FANRPM2",
	0x823f: "NASA_OUTDOOR_CONTROL_PRIME_UNIT",
	0x8240: "NASA_OUTDOOR_ODU_CAPA1",
	0x8241: "NASA_OUTDOOR_ODU_CAPA2",
	0x8244: "NASA_OUTDOOR_OIL_RECOVERY_STEP",
	0x8245: "NASA_OUTDOOR_OIL_BALANCE_STEP",
	0x8247: "NASA_OUTDOOR_DEFROST_STEP",
	0x8248: "NASA_OUTDOOR_SAFETY_START",
	0x824f: "VAR_OUT_CONTROL_REFRIGERANTS_VOLUME",
	0x8254: "VAR_OUT_SENSOR_IPM1",
	0x8255: "VAR_OUT_SENSOR_IPM2",
	0x825e: "VAR_OUT_SENSOR_TEMP_WATER",
	0x825f: "VAR_OUT_SENSOR_PIPEIN1",
	0x8260: "VAR_OUT_SENSOR_PIPEIN2",
	0x8261: "VAR_OUT_SENSOR_PIPEIN3",
	0x8262: "VAR_OUT_SENSOR_PIPEIN4",
	0x8263: "VAR_OUT_SENSOR_PIPEIN5",
	0x8264: "VAR_OUT_SENSOR_PIPEOUT1",
	0x8265: "VAR_OUT_SENSOR_PIPEOUT2",
	0x8266: "VAR_OUT_SENSOR_PIPEOUT3",
	0x8267: "VAR_OUT_SENSOR_PIPEOUT4",
	0x8268: "VAR_OUT_SENSOR_PIPEOUT5",
	0x826b: "VAR_OUT_MCU_SENSOR_SUBCOOLER_IN",
	0x826c: "VAR_OUT_MCU_SENSOR_SUBCOOLER_OUT",
	0x826d: "VAR_OUT_MCU_SUBCOOLER_EEV",
	0x826e: "VAR_OUT_MCU_CHANGE_OVER_EEV1",
	0x826f: "VAR_OUT_MCU_CHANGE_OVER_EEV2",
	0x8270: "VAR_OUT_MCU_CHANGE_OVER_EEV3",
	0x8271: "VAR_OUT_MCU_CHANGE_OVER_EEV4",
	0x8272: "VAR_OUT_MCU_CHANGE_OVER_EEV5",
	0x8273: "VAR_OUT_MCU_CHANGE_OVER_EEV6",
	0x8274: "VAR_OUT_CONTROL_ORDER_CFREQ_COMP2",
	0x8275: "VAR_OUT_CONTROL_TARGET_CFREQ_COMP2",
	0x8276: "VAR_OUT_CONTROL_CFREQ_COMP2",
	0x8277: "VAR_OUT_SENSOR_CT2",
	0x8278: "VAR_OUT_SENSOR_OCT1",
	0x8279: "NASA_OUTDOOR_OCT2",
	0x827a: "VAR_OUT_CONTROL_DSH1",
	0x827e: "NASA_OUTDOOR_ODU_CAPA3",
	0x827f: "NASA_OUTDOOR_ODU_CAPA4",
	0x8280: "VAR_OUT_SENSOR_TOP1",
	0x8281: "VAR_OUT_SENSOR_TOP2",
	0x8282: "NASA_OUTDOOR_TOP_SENSOR_TEMP3",
	0x8287: "VAR_OUT_INSTALL_CAPA",
	0x8298: "NASA_OUTDOOR_COOL_SUM_CAPA",
	0x829a: "VAR_OUT_SENSOR_SUCTION2_1SEC",
	0x829b: "NASA_OUTDOOR_CT_RESTRICT_OPTION",
	0x829c: "NASA_OUTDOOR_COMPENSATE_COOL_CAPA",
	0x829d: "NASA_OUTDOOR_COMPENSATE_HEAT_CAPA",
	0x829f: "VAR_OUT_SENSOR_SAT_TEMP_HIGH_PRESSURE",
	0x82a0: "VAR_OUT_SENSOR_SAT_TEMP_LOW_PRESSURE",
	0x82a3: "NASA_OUTDOOR_CT3",
	0x82a4: "NASA_OUTDOOR_OCT3",
	0x82a6: "NASA_OUTDOOR_FAN_IPM1_TEMP",
	0x82a7: "NASA_OUTDOOR_FAN_IPM2_TEMP",
	0x82a8: "VAR_OUT_CONTROL_IDU_TOTAL_ABSCAPA",
	0x82af: "VAR_OUT_INSTALL_COND_SIZE",
	0x82b3: "NASA_OUTDOOR_DCLINK2_VOLT",
	0x82b8: "VAR_OUT_SENSOR_MIDPRESS",
	0x82b9: "NASA_OUTDOOR_FAN_CT1",
	0x82ba: "NASA_OUTDOOR_FAN_CT2",
	0x82bc: "VAR_OUT_PROJECT_CODE",
	0x82bd: "VAR_OUT_LOAD_FLUX_VARIABLE_VALVE",
	0x82be: "VAR_OUT_SENSOR_CONTROL_BOX",
	0x82bf: "VAR_OUT_SENSOR_CONDOUT2",
	0x82c0: "NASA_OUTDOOR_COMP3_ORDER_HZ",
	0x82c1: "NASA_OUTDOOR_COMP3_TARGET_HZ",
	0x82c2: "NASA_OUTDOOR_COMP3_RUN_HZ",
	0x82c3: "NASA_OUTDOOR_DCLINK3_VOLT",
	0x82c4: "NASA_OUTDOOR_IPM_TEMP3",
	0x82c8: "VAR_OUT_SENSOR_ACCUM_TEMP",
	0x82c9: "VAR_OUT_SENSOR_ENGINE_WATER_TEMP",
	0x82ca: "VAR_OUT_OIL_BYPASS_VALVE",
	0x82cb: "VAR_OUT_SUCTION_OVER_HEAT",
	0x82cc: "VAR_OUT_SUB_COND_OVER_HEAT",
	0x82cd: "VAR_OUT_OVER_COOL",
	0x82ce: "VAR_OUT_COND_OVER_COOL",
	0x82cf: "VAR_OUT_ENGINE_RPM",
	0x82d0: "VAR_OUT_APPEARANCE_RPM",
	0x82d2: "VAR_OUT_SUB_COND_EEV_STEP",
	0x82d3: "NASA_OUTDOOR_SNOW_LEVEL",
	0x82d5: "NASA_OUTDOOR_UPL_TP_COOL",
	0x82d6: "NASA_OUTDOOR_UPL_TP_HEAT",
	0x82db: "VAR_OUT_PHASE_CURRENT",
	0x82de: "VAR_OUT_SENSOR_EVAIN",
	0x82df: "VAR_OUT_SENSOR_TW1",
	0x82e0: "VAR_OUT_SENSOR_TW2",
	0x82e3: "VAR_OUT_PRODUCT_OPTION_CAPA",
	0x82e7: "VAR_OUT_SENSOR_TOTAL_SUCTION",
	0x82e8: "VAR_OUT_LOAD_MCU_HR_BYPASS_EEV",
	0x82e9: "VAR_OUT_SENSOR_PFCM1",
	0x82f5: "VAR_OUT_HIGH_OVERLOAD_DETECT",
	0x82f9: "VAR_OUT_SENSOR_SUCTION3_1SEC",
	0x82fc: "VAR_OUT_LOAD_EVI_SOL_EEV",
	0x8405: "LVAR_OUT_LOAD_COMP1_RUNNING_TIME",
	0x8406: "NASA_OUTDOOR_COMP2_RUNNING_TIME",
	0x840b: "LVAR_OUT_AUTO_INSPECT_RESULT0",
	0x840c: "LVAR_OUT_AUTO_INSPECT_RESULT1",
	0x840e: "NASA_OUTDOOR_COMP3_RUNNING_TIME",
	0x8411: "NASA_OUTDOOR_CONTROL_WATTMETER_1UNIT",
	0x8412: "NASA_OUTDOOR_CONTROL_WATTMETER_1UNIT_ACCUM",
	0x8413: "LVAR_OUT_CONTROL_WATTMETER_1W_1MIN_SUM",
	0x8414: "NASA_OUTDOOR_CONTROL_WATTMETER_ALL_UNIT_ACCUM",
	0x8415: "NASA_OUTDOOR_CONTROL_WATTMETER_TOTAL_SUM",
	0x8416: "NASA_OUTDOOR_CONTROL_WATTMETER_TOTAL_SUM_ACCUM",
	0x8417: "NASA_OUTDOOR_VARIABLE_SETUP_INFO",
	0x8601: "STR_OUT_INSTALL_INVERTER_AND_BOOTLOADER_INFO",
	0x860a: "STR_OUT_BASE_OPTION",
	0x860d: "STR_OUT_INSTALL_MODEL_INFO",
	0x860f: "STR_OUT_INSTALL_OUTDOOR_SETUP_INFO",
	0x8613: "STR_OUT_REF_CHECK_INFO",
};

// ==================== Utility Functions ====================

function crc16(data, startIndex, length) {
	let crc = 0;
	for (let index = startIndex; index < startIndex + length; index++) {
		crc = crc ^ (data[index] << 8);
		for (let i = 0; i < 8; i++) {
			if (crc & 0x8000) {
				crc = (crc << 1) ^ 0x1021;
			} else {
				crc <<= 1;
			}
		}
	}
	return crc & 0xffff;
}

function byteToHex(byte) {
	return byte.toString(16).padStart(2, "0").toUpperCase();
}

function bufferToHex(buffer, spacer = " ") {
	return Array.from(buffer).map(byteToHex).join(spacer);
}

function getCurrentTimestamp() {
	const now = new Date();
	return now.toISOString().replace("T", " ").substring(0, 23);
}

// ==================== Address Class ====================

class Address {
	constructor(klass = AddressClass.Undefined, channel = 0, address = 0) {
		this.klass = klass;
		this.channel = channel;
		this.address = address;
		this.size = 3;
	}

	decode(data, index) {
		this.klass = data[index];
		this.channel = data[index + 1];
		this.address = data[index + 2];
	}

	encode() {
		return [this.klass, this.channel, this.address];
	}

	toString() {
		return `${byteToHex(this.klass)}.${byteToHex(this.channel)}.${byteToHex(this.address)}`;
	}

	toReadableString() {
		const className = AddressClassName[this.klass] || "Unknown";
		return `${className}(${this.toString()})`;
	}
}

// ==================== Command Class ====================

class Command {
	constructor() {
		this.packetInformation = true;
		this.protocolVersion = 2;
		this.retryCount = 0;
		this.packetType = PacketType.StandBy;
		this.dataType = DataType.Undefined;
		this.packetNumber = 0;
		this.size = 3;
	}

	decode(data, index) {
		this.packetInformation = (data[index] & 0x80) >> 7 === 1;
		this.protocolVersion = (data[index] & 0x60) >> 5;
		this.retryCount = (data[index] & 0x18) >> 3;
		this.packetType = (data[index + 1] & 0xf0) >> 4;
		this.dataType = data[index + 1] & 0x0f;
		this.packetNumber = data[index + 2];
	}

	encode() {
		const byte1 = ((this.packetInformation ? 1 : 0) << 7) + (this.protocolVersion << 5) + (this.retryCount << 3);
		const byte2 = (this.packetType << 4) + this.dataType;
		return [byte1, byte2, this.packetNumber];
	}
}

// ==================== MessageSet Class ====================

class MessageSet {
	constructor(messageNumber) {
		this.messageNumber = messageNumber;
		this.type = (messageNumber & 0x0600) >> 9;
		this.value = 0;
		this.structure = null;
		this.size = 2;
	}

	static decode(data, index, capacity) {
		const messageNumber = (data[index] << 8) | data[index + 1];
		const set = new MessageSet(messageNumber);

		switch (set.type) {
			case MessageSetType.Enum:
				set.value = data[index + 2];
				set.size = 3;
				break;

			case MessageSetType.Variable:
				set.value = (data[index + 2] << 8) | data[index + 3];
				set.size = 4;
				break;

			case MessageSetType.LongVariable:
				set.value = (data[index + 2] << 24) | (data[index + 3] << 16) | (data[index + 4] << 8) | data[index + 5];
				set.size = 6;
				break;

			case MessageSetType.Structure:
				set.size = data.length - index - 3;
				break;
		}

		return set;
	}

	getReadableValue() {
		const msgName = MessageNumberNames[this.messageNumber];

		// Temperature values
		if (msgName && msgName.includes("temp")) {
			return `${(this.value / 10.0).toFixed(1)}°C`;
		}

		// Power status
		if (msgName && msgName.includes("power")) {
			return this.value ? "ON" : "OFF";
		}

		// Operation mode
		if (this.messageNumber === 0x4001) {
			const modes = ["Auto", "Cool", "Dry", "Fan", "Heat"];
			return modes[this.value] || `Unknown(${this.value})`;
		}

		// Fan mode
		if (this.messageNumber === 0x4006 || this.messageNumber === 0x4007) {
			const fans = ["Auto", "Low", "Mid", "High", "Turbo"];
			return fans[this.value] || `Unknown(${this.value})`;
		}

		// Default
		return this.value.toString();
	}

	toString() {
		const typeName = MessageSetTypeName[this.type];
		const msgName = MessageNumberNames[this.messageNumber] || "UNKNOWN";
		const readableValue = this.getReadableValue();

		return `${typeName} [0x${this.messageNumber.toString(16).padStart(4, "0")}] ${msgName} = ${readableValue} (raw: ${this.value})`;
	}
}

// ==================== Packet Class ====================

class Packet {
	constructor() {
		this.sa = new Address();
		this.da = new Address();
		this.command = new Command();
		this.messages = [];
		this.rawData = null;
		this.timestamp = null;
	}

	decode(data) {
		this.rawData = Buffer.from(data);
		this.timestamp = getCurrentTimestamp();

		if (data[0] !== NASA_START_BYTE) {
			return { success: false, error: "Invalid start byte" };
		}

		if (data.length < 16 || data.length > 1500) {
			return { success: false, error: "Unexpected size" };
		}

		const size = (data[1] << 8) | data[2];
		if (size + 2 !== data.length) {
			return { success: false, error: "Size mismatch" };
		}

		if (data[data.length - 1] !== NASA_END_BYTE) {
			return { success: false, error: "Invalid end byte" };
		}

		const crcActual = crc16(data, 3, size - 4);
		const crcExpected = (data[data.length - 3] << 8) | data[data.length - 2];
		if (crcExpected !== crcActual) {
			return { success: false, error: `CRC error: expected ${crcExpected}, got ${crcActual}` };
		}

		let cursor = 3;

		this.sa.decode(data, cursor);
		cursor += this.sa.size;

		this.da.decode(data, cursor);
		cursor += this.da.size;

		this.command.decode(data, cursor);
		cursor += this.command.size;

		const capacity = data[cursor];
		cursor++;

		this.messages = [];
		for (let i = 0; i < capacity; i++) {
			const message = MessageSet.decode(data, cursor, capacity);
			this.messages.push(message);
			cursor += message.size;
		}

		return { success: true };
	}

	getSignature() {
		// Create a unique signature for grouping similar packets
		const msgSignature = this.messages.map((m) => m.messageNumber.toString(16).padStart(4, "0")).join(",");

		return `${this.sa.toString()}->${this.da.toString()}:${DataTypeName[this.command.dataType]}:[${msgSignature}]`;
	}

	toFormattedString(includeRaw = true) {
		let output = [];

		output.push("┌─────────────────────────────────────────────────────────────────");
		output.push(`│ Timestamp: ${this.timestamp}`);
		output.push("├─────────────────────────────────────────────────────────────────");
		output.push(`│ Source:      ${this.sa.toReadableString()}`);
		output.push(`│ Destination: ${this.da.toReadableString()}`);
		output.push("├─────────────────────────────────────────────────────────────────");
		output.push(`│ Packet Type: ${PacketTypeName[this.command.packetType] || "Unknown"}`);
		output.push(`│ Data Type:   ${DataTypeName[this.command.dataType] || "Unknown"}`);
		output.push(`│ Packet #:    ${this.command.packetNumber}`);
		output.push(`│ Protocol:    v${this.command.protocolVersion}`);
		output.push(`│ Retry Count: ${this.command.retryCount}`);
		output.push("├─────────────────────────────────────────────────────────────────");
		output.push(`│ Messages (${this.messages.length}):`);

		for (let i = 0; i < this.messages.length; i++) {
			output.push(`│   ${i + 1}. ${this.messages[i].toString()}`);
		}

		if (includeRaw) {
			output.push("├─────────────────────────────────────────────────────────────────");
			output.push("│ Raw Packet Data:");
			const hexData = bufferToHex(this.rawData, " ");
			const chunks = hexData.match(/.{1,48}/g) || [];
			chunks.forEach((chunk) => {
				output.push(`│   ${chunk}`);
			});
		}

		output.push("└─────────────────────────────────────────────────────────────────");
		output.push("");

		return output.join("\n");
	}

	toCompactString() {
		// Compact multi-line format with all packet information
		const msgDetails = this.messages
			.map((m) => {
				const name = MessageNumberNames[m.messageNumber] || `0x${m.messageNumber.toString(16)}`;
				const value = m.getReadableValue();
				return `${name}=${value}`;
			})
			.join(", ");

		// Format raw data in space-efficient hex format
		const rawHex = bufferToHex(this.rawData, " ");

		// Build compact multi-line output
		const lines = [];
		lines.push(`[${this.timestamp}] ${this.sa.toReadableString()} → ${this.da.toReadableString()}`);
		lines.push(
			`  Type: ${PacketTypeName[this.command.packetType]} | Data: ${DataTypeName[this.command.dataType]} | Pkt#: ${this.command.packetNumber} | Proto: v${
				this.command.protocolVersion
			} | Retry: ${this.command.retryCount}`,
		);
		lines.push(`  Msgs: ${this.messages.length} | ${msgDetails}`);
		lines.push(`  Raw: ${rawHex}`);

		return lines.join("\n");
	}
}

// ==================== Packet Analyzer ====================

class PacketAnalyzer {
	/**
	 * Analyzes packet buffer and extracts complete packets
	 * @param {Buffer} buffer - Input buffer
	 * @returns {Object} - { packets: Packet[], remainingBuffer: Buffer, errors: String[] }
	 */
	static analyzeBuffer(buffer) {
		const packets = [];
		const errors = [];
		let workingBuffer = buffer;

		while (workingBuffer.length > 0) {
			if (workingBuffer[0] !== NASA_START_BYTE) {
				// Invalid start byte, skip to next potential start
				const nextStart = workingBuffer.indexOf(NASA_START_BYTE, 1);
				if (nextStart === -1) {
					workingBuffer = Buffer.alloc(0);
					break;
				} else {
					errors.push(`Skipped ${nextStart} bytes looking for start byte`);
					workingBuffer = workingBuffer.slice(nextStart);
					continue;
				}
			}

			if (workingBuffer.length >= 3) {
				const expectedSize = (workingBuffer[1] << 8) | workingBuffer[2];
				const totalSize = expectedSize + 2;

				if (workingBuffer.length >= totalSize) {
					const packetData = workingBuffer.slice(0, totalSize);
					workingBuffer = workingBuffer.slice(totalSize);

					const packet = new Packet();
					const result = packet.decode(packetData);

					if (result.success) {
						packets.push(packet);
					} else {
						errors.push(`Decode error: ${result.error}`);
					}
				} else {
					// Wait for more data
					break;
				}
			} else {
				// Wait for more data
				break;
			}
		}

		return { packets, remainingBuffer: workingBuffer, errors };
	}
}

// ==================== Exports ====================

module.exports = {
	Packet,
	PacketAnalyzer,
	Address,
	Command,
	MessageSet,
	PacketType,
	PacketTypeName,
	DataType,
	DataTypeName,
	MessageSetType,
	MessageSetTypeName,
	MessageNumberNames,
	AddressClass,
	AddressClassName,
	NASA_START_BYTE,
	NASA_END_BYTE,
	bufferToHex,
	getCurrentTimestamp,
};
