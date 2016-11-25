/// <reference path="./.jsonenv/_current_result.json.d.ts" />
/// <reference path="./node_modules/@types/node/index.d.ts" />

interface Unknown {
	
}

declare interface DockerInspect {
	Id: string;
	Created: string;
	Path: string;
	Args: string[];
	State: {
		Status: string;
		Running: boolean;
		Paused: boolean;
		Restarting: boolean;
		OOMKilled: boolean;
		Dead: boolean;
		Pid: number;
		ExitCode: number;
		Error: string;
		StartedAt: string;
		FinishedAt: string
	};
	Image: string;
	ResolvConfPath: string;
	HostnamePath: string;
	HostsPath: string;
	LogPath: string;
	Name: string;
	RestartCount: number;
	Driver: string;
	MountLabel: string;
	ProcessLabel: string;
	AppArmorProfile: string;
	ExecIDs: any;
	HostConfig: {
		Binds: string[];
		ContainerIDFile: string;
		LogConfig: {
			Type: string;
			Config: Unknown
		};
		NetworkMode: string;
		PortBindings: {
			[id: string]: {
				HostIp: string;
				HostPort: string;
			}[]
		};
		RestartPolicy: {
			Name: string;
			MaximumRetryCount: number
		};
		AutoRemove: boolean;
		VolumeDriver: string;
		VolumesFrom: any;
		CapAdd: any;
		CapDrop: any;
		Dns: string[];
		DnsOptions: Unknown[];
		DnsSearch: Unknown[];
		ExtraHosts: string[];
		GroupAdd: any;
		IpcMode: string;
		Cgroup: string;
		Links: string[];
		OomScoreAdj: number;
		PidMode: string;
		Privileged: boolean;
		PublishAllPorts: boolean;
		ReadonlyRootfs: boolean;
		SecurityOpt: any;
		UTSMode: string;
		UsernsMode: string;
		ShmSize: number;
		Runtime: string;
		ConsoleSize: number[];
		Isolation: string;
		CpuShares: number;
		Memory: number;
		CgroupParent: string;
		BlkioWeight: number;
		BlkioWeightDevice: any;
		BlkioDeviceReadBps: any;
		BlkioDeviceWriteBps: any;
		BlkioDeviceReadIOps: any;
		BlkioDeviceWriteIOps: any;
		CpuPeriod: number;
		CpuQuota: number;
		CpusetCpus: string;
		CpusetMems: string;
		Devices: Unknown[];
		DiskQuota: number;
		KernelMemory: number;
		MemoryReservation: number;
		MemorySwap: number;
		MemorySwappiness: number;
		OomKillDisable: boolean;
		PidsLimit: number;
		Ulimits: any;
		CpuCount: number;
		CpuPercent: number;
		IOMaximumIOps: number;
		IOMaximumBandwidth: number
	};
	GraphDriver: {
		Name: string;
		Data: {
			DeviceId: string;
			DeviceName: string;
			DeviceSize: string
		}
	};
	Mounts: {
		Source: string;
		Destination: string;
		Mode: string;
		RW: boolean;
		Propagation: string;
	}[];
	Config: {
		Hostname: string;
		Domainname: string;
		User: string;
		AttachStdin: boolean;
		AttachStdout: boolean;
		AttachStderr: boolean;
		ExposedPorts: {
			[id: string]: {}
		};
		Tty: boolean;
		OpenStdin: boolean;
		StdinOnce: boolean;
		Env: string[];
		Cmd: string[];
		Image: string;
		Volumes: {
			[id: string]: Unknown;
		};
		WorkingDir: string;
		Entrypoint: any;
		OnBuild: any;
		Labels: {
			[id: string]: string;
		}
	};
	NetworkSettings: {
		Bridge: string;
		SandboxID: string;
		HairpinMode: boolean;
		LinkLocalIPvnumberAddress: string;
		LinkLocalIPvnumberPrefixLen: number;
		Ports: {
			[id: string]: {
				HostIp: string;
				HostPort: string;
			}[]
		};
		SandboxKey: string;
		SecondaryIPAddresses: any;
		SecondaryIPvnumberAddresses: any;
		EndpointID: string;
		Gateway: string;
		GlobalIPvnumberAddress: string;
		GlobalIPvnumberPrefixLen: number;
		IPAddress: string;
		IPPrefixLen: number;
		IPvnumberGateway: string;
		MacAddress: string;
		Networks: {
			bridge: {
				IPAMConfig: any;
				Links: any;
				Aliases: any;
				NetworkID: string;
				EndpointID: string;
				Gateway: string;
				IPAddress: string;
				IPPrefixLen: number;
				IPvnumberGateway: string;
				GlobalIPvnumberAddress: string;
				GlobalIPvnumberPrefixLen: number;
				MacAddress: string
			}
		}
	}
}
