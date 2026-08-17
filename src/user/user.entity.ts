import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
  OneToOne,
  UpdateDateColumn,
} from 'typeorm';
import { Profile } from './profile.entity';
import { Logs } from '../logs/logs.entity';
import { Roles } from '../roles/roles.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'name', type: 'varchar', length: 50, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 254, nullable: true, unique: true })
  email!: string | null;

  @Column({ name: 'password', type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: 'active' | 'disabled';

  @Column({ default: 0 })
  failedLoginCount!: number;

  @Column({ type: 'datetime', nullable: true })
  lockedUntil!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  passwordChangedAt!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  emailVerifiedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Logs, (log) => log.user)
  logs!: Logs[];

  @ManyToMany(() => Roles, (roles) => roles.users)
  @JoinTable({
    name: 'user_roles',
  })
  roles!: Roles[];

  @OneToOne(() => Profile, (profile) => profile.user)
  profile!: Profile;
}
