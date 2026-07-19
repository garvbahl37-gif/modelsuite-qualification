import TaskCard from './TaskCard';

const AvailableTasksList = ({ tasks, onClaimed }) => {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="bg-bg-card border border-dashed border-border rounded-xl py-10 px-6 text-center text-text-faint text-sm">
        No open tasks right now — check back later!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
      {tasks.map((task) => (
        <TaskCard key={task._id} task={task} showClaimButton onClaimed={onClaimed} />
      ))}
    </div>
  );
};

export default AvailableTasksList;
