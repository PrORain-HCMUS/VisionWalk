export const formatTimeAgo = (dateString: string): string => {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        // If invalid date or future date
        if (isNaN(date.getTime()) || diffInSeconds < 0) {
            return 'Không rõ';
        }

        // Less than 1 minute
        if (diffInSeconds < 60) {
            return 'vừa xong';
        }

        // Less than 1 hour
        if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} phút trước`;
        }

        // Less than 24 hours
        if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} giờ trước`;
        }

        // Less than 7 days
        if (diffInSeconds < 604800) {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} ngày trước`;
        }

        // Less than 30 days
        if (diffInSeconds < 2592000) {
            const weeks = Math.floor(diffInSeconds / 604800);
            return `${weeks} tuần trước`;
        }

        // Less than 365 days
        if (diffInSeconds < 31536000) {
            const months = Math.floor(diffInSeconds / 2592000);
            return `${months} tháng trước`;
        }

        // More than a year
        const years = Math.floor(diffInSeconds / 31536000);
        return `${years} năm trước`;
    } catch {
        return 'Không rõ';
    }
};