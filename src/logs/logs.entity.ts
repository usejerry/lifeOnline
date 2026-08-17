import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../user/user.entity';

@Entity()
export class Logs {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  path!: string;

  @Column()
  method!: string;

  @Column()
  data!: string;

  @Column()
  result!: string;

  @ManyToOne(() => User, (user) => user.logs)
  user!: User;
}
